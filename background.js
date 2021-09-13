//Background functions
var SlateBackground = (function () {
  function SlateBackground() {
    //Create background
  }

  SlateBackground.prototype.init = async () => {
    console.log("Initilize slate");
  };

  SlateBackground.prototype.loadApp = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      let activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        message: "openSlateApp",
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

  SlateUpload.prototype.start = async (props) => {
    async function convertToData(props) {
      const { src } = props.file;

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

    async function uploadToSlate(fileData, apiData) {
      console.log("follow this api data:::", apiData);
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
      let file = new File([fileBlob], source, { type: "image/png" });
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
      return json;
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

    async function processArray(array) {
      for (const file of array) {
        let data = await convertToData(file.data.file);
        await uploadToSlate(data, file);
        //let slateData = await getSlateData(file);
        console.log("Next file");
      }
      console.log("All files uploaded");
    }

    processArray(props);
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
  chrome.tabs.executeScript(activeTab, { file: "app/scripts/jquery.min.js" });
  chrome.tabs.executeScript(
    activeTab,
    { file: "content-script.js" },
    slateBg.loadApp()
  );
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

  if (request.uploadData == "slate") {
    let upload = new SlateUpload();
    let files = JSON.parse(request.data);
    let pageData = JSON.parse(request.page);
    let apiData = JSON.parse(request.api);

    //console.log("file data in the backgorund:", files);
    console.log("page data in the backgorund:", pageData);
    console.log("api data in the backgorund:", apiData);

    upload.start(apiData);
  }
});
