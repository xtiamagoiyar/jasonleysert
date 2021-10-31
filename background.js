//Background functions
var SlateBackground = (function () {
  function SlateBackground() {
    //Create background
  }

  SlateBackground.prototype.init = async () => {
    console.log("Initilize slate");
  };

  SlateBackground.prototype.loadApp = (type, singleImageUrl = "") => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      let activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        message: "openSlateApp",
        uploadType: type,
        singleImageUrl: singleImageUrl,
      });
    });
  };

  SlateBackground.prototype.addUpload = (props) => {
    // add data from upload to history
    console.log(props);
    // TODO: (@jason) props should look like this:
    // {
    //   name: "jim-dark-secrets.png",
    //   type: "image/jpeg",
    //   source: "https://www.criterion.com/shop/collection/169-wes-anderson",
    //   cid: "a238149phsdfaklsjdfhlqw48rlfsad",
    //   date: "2020-10-13T19:49:41.036Z",
    //   url: "https://slate.textile.io/ipfs/bafkreiepfcul4ortkdvxkqe4hfbulggzvlcijkr3mgzfhnbbrcgwlykvxu",
    //   uploading: false,
    //   id: "jasonwillfigureouthowtodotheids"
    // };
    chrome.storage.local.get(["uploads"], (result) => {
      let uploads = result.uploads;
      uploads.push(props);
      chrome.storage.local.set({ uploads });
    });
    return true;
  };

  return SlateBackground;
})();

//Background functions
var SlateUpload = (function () {
  function SlateUpload() {
    //Create background
  }

  SlateUpload.prototype.start = async (props, pageData) => {
    async function convertToData(props) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          var reader = new FileReader();
          reader.onloadend = function () {
            resolve(reader.result);
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.open("GET", props.file.src);
        xhr.responseType = "blob";
        console.log("done convert");
        xhr.send();
      });
    }

    async function addDataUpload(props) {
      console.log(props);
      chrome.storage.local.get(["uploads"], (result) => {
        let uploads = [];
        uploads = result["uploads"];
        uploads.push(props);
        chrome.storage.local.set({ uploads });
      });
      console.log("done");
      return true;
    }

    async function updateDataUpload(props, uploadId) {
      console.log("look at props", props);
      chrome.storage.local.get(["uploads"], (result) => {
        let uploads = result.uploads;
        console.log("upload look for id::::", uploads);

        for (var i in uploads) {
          if (uploads[i].id == uploadId) {
            console.log("upload in loop::", uploads[i]);
            uploads[i].uploading = false;
            uploads[i].cid = props.data.cid;
            uploads[i].url = props.url;
            break; //Stop this loop
          }
        }
        console.log("done final upload array:", uploads);
        chrome.storage.local.set({ uploads: uploads }, function () {
          console.log("saved");
        });
      });
      return true;
    }

    async function uploadToSlate(fileData, apiData, pageData) {
      console.log("file data:", apiData);
      let date = Date.now();
      let uploadData = {
        name: apiData.data.file.file.altTitle || pageData.title,
        type: "image/jpeg",
        source: pageData.source,
        sourceTitle: pageData.title,
        originalFile: apiData.data.file.file.src,
        cid: "",
        date: date,
        url: "",
        uploading: true,
        id: apiData.data.file.file.id,
      };

      await addDataUpload(uploadData);
      console.log("submitted to local", uploadData);

      //console.log("follow this api data:::", apiData);
      var arr = fileData.split(","),
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
      var mime = fileData.split(",")[0].split(":")[1].split(";")[0];

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const url =
        "https://uploads.slate.host/api/public/" + apiData.data.slate.id;
      let fileBlob = new Blob([u8arr], { mime });
      let source = "";
      let file = new File([fileBlob], uploadData.name, { type: "image/png" });
      let data = new FormData();
      data.append("data", file);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          // NOTE: your API key
          Authorization: "Basic " + apiData.data.api,
        },
        body: data,
      });
      const json = await response.json();
      await updateDataUpload(json, uploadData.id);

      return json;
      //let updateSlateData = json;
      //console.log("JSONLLL", JSON.parse(updateSlateData));

      //updateSlateData.slate.data.objects[0].source = pageData.source;

      //console.log("updated slate111111111:", updateSlateData);

      /*

      const updateSlateResponse = await fetch(
        "https://slate.host/api/v1/update-slate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // NOTE: your API key
            Authorization: "Basic " + apiData.data.api,
          },
          body: JSON.stringify({ data: updateSlateData["slate"] }),
        }
      );
      const updateSlateFinal = await updateSlateResponse;
      console.log(updateSlateFinal);

      return updateSlateFinal;
      */
    }

    async function getSlateData(fileData) {
      const response = await fetch("https://slate.host/api/v1/get-slate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // NOTE: your API key
          Authorization: "Basic " + fileData.data.api,
        },
        body: JSON.stringify({
          data: {
            // NOTE: your slate ID
            id: fileData.data.slate.id,
          },
        }),
      });
      const json = await response.json();
      //console.log("slate data:", json);
      return json;
    }

    async function processArray(array, pageData) {
      for (const file of array) {
        console.log("page data in process:", pageData);
        let data = await convertToData(file.data.file);
        await uploadToSlate(data, file, pageData);
        //let slateData = await getSlateData(file);
        console.log("Next file");
      }
      console.log("All files uploaded");
    }

    processArray(props, pageData);
  };
  return SlateUpload;
})();
//
//
//Background event listeners
chrome.runtime.onInstalled.addListener(function (tab) {
  //on new install, open the welcome page
  chrome.tabs.create({
    url: chrome.extension.getURL("app/pages/welcome.html"),
  });
});

//Wait for Slate Extension icon to be clicked
chrome.browserAction.onClicked.addListener(async function (tabs) {
  let slateBg = new SlateBackground();
  await slateBg.init();
  //inject all Slate scripts needed into the current tab
  let activeTab = tabs[0];
  console.log(activeTab);
  let type = "multi";
  chrome.tabs.executeScript(activeTab, { file: "app/scripts/jquery.min.js" });
  chrome.tabs.executeScript(
    activeTab,
    { file: "content-script.js" },
    slateBg.loadApp(type)
  );
});

onClickHandlerImage = async (info, tabs) => {
  url = info.srcUrl;
  let slateBg = new SlateBackground();
  await slateBg.init();
  let activeTab = tabs[0];

  //inject all Slate scripts needed into the current tab
  let type = "single";
  chrome.tabs.executeScript(activeTab, { file: "app/scripts/jquery.min.js" });
  chrome.tabs.executeScript(
    activeTab,
    { file: "content-script.js" },
    slateBg.loadApp(type, url)
  );
};

chrome.contextMenus.create({
  title: "Add image",
  contexts: ["image"],
  //parentId: "parent",
  id: "image",
  onclick: onClickHandlerImage,
});

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.message == "settings") {
    chrome.tabs.create({
      url: chrome.extension.getURL("app/pages/settings.html"),
    });
  }

  if (request.message == "uploadsHistory") {
    chrome.tabs.create({
      url: chrome.extension.getURL("app/pages/uploads.html"),
    });
  }

  if (request.uploadData == "slate") {
    let upload = new SlateUpload();
    let files = JSON.parse(request.data);
    let pageData = JSON.parse(request.page);
    let apiData = JSON.parse(request.api);

    //console.log("file data in the backgorund:", files);
    console.log("files in the backgorund:", files);
    console.log("api data in the backgorund:", apiData);

    upload.start(apiData, pageData);
  }
});
