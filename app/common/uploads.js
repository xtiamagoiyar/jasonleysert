var Uploads = function () {
  this.uploadData = [];
};

Uploads.prototype.getUploads = async () => {
  var storage = new Promise(function (resolve, reject) {
    chrome.storage.local.get(["uploads"], function (result) {
      resolve(result);
    });
  });

  let getData = await storage;
  return getData;
};

Uploads.prototype.clearUploads = async () => {
  let allUploads = [];
  chrome.storage.local.set({ uploads: allUploads }, function () {
    console.log("cleared!");
    return;
  });
};

Uploads.prototype.showUploads = (upload, filetype, status, cid) => {
  let uploadTable = document.getElementById("slate-uploads");
  let uploadEntries = document.createElement("div");
  let fileTypeIcon = document.createElement("div");
  let popOver = document.createElement("div");
  console.log(cid);
  popOver.innerHTML =
    '<div class="slate-popover"><div class="slate-popover-item click-open-cid" data-cid="' +
    cid +
    '" id="viewOnSlate">View file on Slate</div><div class="slate-popover-item click-copy-cid" data-cid="' +
    cid +
    '">Copy file URL</div><div class="slate-popover-item">Remove from history</div></div>';

  if (filetype.startsWith("image/")) {
    fileTypeIcon.innerHTML =
      '<object class="slate-icon-large" type="image/svg+xml" data="../common/svg/image.svg"></object>';
  }
  uploadEntries.className = "slate-table-row";
  console.log(upload);

  uploadEntries.innerHTML =
    upload
      .map((uploadInfo, i) =>
        i === 0
          ? '<div class="slate-icon-column"><div class="slate-file-icon">' +
            fileTypeIcon.innerHTML +
            "</div>" +
            "<div>" +
            uploadInfo +
            "</div>" +
            "</div>"
          : i === 2
          ? '<div class="slate-icon-column">' +
            '<div class="slate-link-info">' +
            uploadInfo +
            "</div>" +
            '<object data-url="' +
            uploadInfo +
            '" class="slate-icon" id="sourceUrl" type="image/svg+xml" data="../common/svg/external-link.svg"></object>' +
            "</div>"
          : '<div class="slate-column-width">' + uploadInfo + "</div>"
      )
      .join("") +
    '<div class="slate-dropdown"><object class="slate-icon-large" type="image/svg+xml" data="../common/svg/more-horizontal.svg"></object></div>' +
    popOver.innerHTML;

  uploadTable.appendChild(uploadEntries);
};

Uploads.prototype.removeUpload = () => {
  //TODO (@Tara/@Jason): remove single file upload data
};
Uploads.prototype.removeUploads = () => {
  //TODO (@Tara/@Jason): remove all upload data
};
Uploads.prototype.copyFileUrl = () => {
  //TODO (@Tara/@Jason): copy file url
};

Uploads.prototype.toggleDropdownDisplay = () => {
  let dropdownBtns = document.getElementsByClassName("slate-dropdown");
  for (let dropdownBtn of dropdownBtns) {
    dropdownBtn.onclick = () => {
      if (dropdownBtn.nextElementSibling.style.display === "block") {
        dropdownBtn.nextElementSibling.style.display = "none";
      } else {
        dropdownBtn.nextElementSibling.style.display = "block";
      }
    };
  }
};

var uploads = new Uploads();

document.addEventListener("DOMContentLoaded", async () => {
  //TODO (@Tara/@Jason) bug: nothing gets returned here
  let existingUploads = await uploads.getUploads();
  console.log("existingUploads", existingUploads);

  if (existingUploads.uploads.length > 0) {
    //TODO (@Tara/@Jason) fake data, to be deleted later
    let fakeUploads = [
      {
        name: "test-db.png",
        type: "image/jpeg",
        source: "https://www.criterion.com/shop/collection/169-wes-anderson",
        cid: "a238149phsdfaklsjdfhlqw48rlfsad",
        date: "2020-10-13T19:49:41.036Z",
        url: "https://slate.textile.io/ipfs/123",
        uploading: false,
      },
    ];

    let sort = existingUploads.uploads.reverse();

    sort.forEach((upload) => {
      let date = new Date(upload.date);
      uploadInfo = [upload.name, date, upload.source];
      uploads.showUploads(
        uploadInfo,
        upload.type,
        upload.uploading,
        upload.cid
      );
    });

    uploads.toggleDropdownDisplay();

    document
      .getElementById("sourceUrl")
      .addEventListener("click", function (e) {
        let url = e.target.attributes[1].value;
        var win = window.open(url, "_blank");
        win.focus();
      });

    let openCID = document.getElementsByClassName("click-open-cid");
    for (var i = 0; i < openCID.length; i++) {
      openCID[i].onclick = function (e) {
        console.log(e.target.attributes["data-cid"].value);
        let url =
          "https://slate.textile.io/ipfs/" +
          e.target.attributes["data-cid"].value;
        var win = window.open(url, "_blank");
        win.focus();
      };
    }

    let copyCID = document.getElementsByClassName("click-copy-cid");
    for (var i = 0; i < copyCID.length; i++) {
      copyCID[i].onclick = function (e) {
        console.log(e.target.attributes["data-cid"].value);
        let url =
          "https://slate.textile.io/ipfs/" +
          e.target.attributes["data-cid"].value;
        console.log(url);
        url.select();
        document.execCommand("copy");
        console.log("copied");
        //var win = window.open(url, "_blank");
        //..win.focus();
      };
    }
    document
      .getElementById("clear-history-btn")
      .addEventListener("click", function (e) {
        let modal = confirm(
          "Are you sure you want to clear your upload history?"
        );
        if (modal == true) {
          uploads.clearUploads();
          location.reload();
        } else {
          return;
        }
      });
  } else {
    document.getElementById("empty-uploads-message").style.display = "inline";
    //document.getElementById("empty-uploads-message").disabled = true;
  }
});
