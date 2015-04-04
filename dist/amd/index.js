define(["exports", "module"], function (exports, module) {
  "use strict";

  var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

  var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var protocol = window.location.href.split("://")[0];
  if (protocol === "file") {
    protocol = "http";
  }

  var base_url = "" + protocol + "://alfafile.net/api/v1";

  var token = "";

  var UPL_STATE_UPLOADING = 0;
  var UPL_STATE_PROCESSING = 1;
  var UPL_STATE_DONE = 2;
  var UPL_STATE_FAIL = 3;

  var ApiError = (function (_Error) {
    function ApiError(message) {
      _classCallCheck(this, ApiError);

      _get(Object.getPrototypeOf(ApiError.prototype), "constructor", this).call(this);
      this.name = "ApiError";
      this.message = message;
    }

    _inherits(ApiError, _Error);

    return ApiError;
  })(Error);

  var NetworkError = (function (_Error2) {
    function NetworkError(message) {
      _classCallCheck(this, NetworkError);

      _get(Object.getPrototypeOf(NetworkError.prototype), "constructor", this).call(this);
      this.name = "NetworkError";
      this.message = message;
    }

    _inherits(NetworkError, _Error2);

    return NetworkError;
  })(Error);

  var _doCheckUploadState = function _doCheckUploadState(params, upload_id, cb) {
    params.token = params.token || token;

    var params_str = "upload_id=" + encodeURIComponent(upload_id);
    params_str += "&token=" + encodeURIComponent(params.token);

    var check_int = setInterval(function () {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "" + base_url + "/file/upload_info?" + params_str, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          if (data.response.upload.state !== UPL_STATE_PROCESSING) {
            if (cb && typeof cb === "function") {
              clearInterval(check_int);
              return cb(null, data.response.upload);
            }
          }
        } else if (xhr.readyState === 4 && xhr.status !== 200) {
          if (cb && typeof cb === "function") {
            return cb(new NetworkError("NetworkError"));
          }
        }
      };
      xhr.send();
    }, 1000);
  };

  var _doFileUpload = function _doFileUpload(params, upload_url, cb) {
    var form_data = new FormData();

    form_data.append("file", params.file);
    form_data.append("token", params.token || token);

    var upload_progress = function upload_progress(event) {
      if (event.lengthComputable) {
        if (params.progress_cb && typeof params.progress_cb === "function") {
          return params.progress_cb(Math.ceil(event.loaded / event.total * 100));
        }
      }
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", upload_url, true);
    xhr.upload.onprogress = upload_progress;
    if (params.abort_cb && typeof params.abort_cb === "function") {
      xhr.onabort = params.abort_cb;
    }

    xhr.onreadystatechange = function () {
      var data, response;
      if (xhr.readyState === 4 && xhr.status === 200) {
        data = JSON.parse(xhr.responseText);
        response = data.response;
        if (data.status === 200) {
          return _doCheckUploadState(params, response.upload.upload_id, cb);
        } else {
          if (cb && typeof cb === "function") {
            return cb(new ApiError("" + (data ? data.details : "")));
          }
        }
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        if (cb && typeof cb === "function") {
          return cb(new NetworkError("Network error"));
        }
      }
    };

    xhr.send(form_data);

    if (params.upload_xhr_available && typeof params.upload_xhr_available === "function") {
      return params.upload_xhr_available(xhr);
    }
  };

  var _itemMethodHelper = function _itemMethodHelper(itype, method, params, response_field, cb) {
    params = params || {};
    params.token = params.token || token;

    var params_str = "";
    Object.keys(params).forEach(function (key) {
      var val = params[key];
      if (typeof val !== "function") {
        params_str += "" + key + "=" + encodeURIComponent(val) + "&";
      }
    });

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "" + base_url + "/" + itype + "/" + method + "?" + params_str, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);

        if (data.status === 200 && data.response) {
          // return the default result or a special field?
          var result = response_field ? data.response[response_field] : data.response;

          // two-level method or not?
          var twolevel = false;

          if (itype === "user" && method === "login") {
            token = data.response.token; // set global token on login
          } else if (itype === "file" && method === "upload") {
            // file upload method
            var up_state = data.response.upload.state;
            if (up_state === UPL_STATE_UPLOADING) {
              twolevel = true; // it's a two-level operation
              _doFileUpload(params, data.response.upload.url, cb);
            }
          }
          // by default: call passed callback with a response result
          if (cb && typeof cb === "function" && !twolevel) {
            cb(null, result);
          }
        } else {
          // once the response status in not 200, we should pass an ApiError to callback
          if (cb && typeof cb === "function") {
            cb(new ApiError("" + (data ? data.details : "")));
          }
        }
      } else if (xhr.readyState === 4 && xhr.status === 200) {
        if (cb && typeof cb === "function") {
          cb(new NetworkError("Network error"));
        }
      }
    };

    xhr.send();
  };

  var userLogin = function userLogin(login, password, cb) {
    return _itemMethodHelper("user", "login", {
      login: login,
      password: password
    }, "user", cb);
  };

  var userInfo = function userInfo(cb) {
    return _itemMethodHelper("user", "info", {}, "user", cb);
  };

  var fileUpload = function fileUpload(name, hash, size, file, options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};
    cb = args.pop();

    if (args.length === 5) {
      params = options;
    }

    params.name = name;
    params.hash = hash;
    params.size = size;
    params.file = file;

    return _itemMethodHelper("file", "upload", params, "upload", cb);
  };

  var fileRename = function fileRename(file_id, name, cb) {
    var params = {
      file_id: file_id,
      name: name
    };
    return _itemMethodHelper("file", "rename", params, "file", cb);
  };

  var fileDelete = function fileDelete(file_id, cb) {
    var params = {
      file_id: file_id
    };
    return _itemMethodHelper("file", "delete", params, "result", cb);
  };

  var fileCopy = function fileCopy(file_id, folder_id_dest, cb) {
    var params = {
      file_id: file_id,
      folder_id_dest: folder_id_dest
    };
    return _itemMethodHelper("file", "copy", params, "result", cb);
  };

  var fileMove = function fileMove(file_id, folder_id_dest, cb) {
    var params = {
      file_id: file_id,
      folder_id_dest: folder_id_dest
    };
    return _itemMethodHelper("file", "move", params, "result", cb);
  };

  var fileChangeMode = function fileChangeMode(file_id, mode, cb) {
    var params = {
      file_id: file_id,
      mode: mode
    };
    return _itemMethodHelper("file", "change_mode", params, "file", cb);
  };

  var folderInfo = function folderInfo(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};
    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("folder", "info", params, "folder", cb);
  };

  var folderContent = function folderContent(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};
    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("folder", "content", params, "folder", cb);
  };

  var folderCreate = function folderCreate(name, options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = { name: name };

    cb = args.pop();
    if (args.length === 2) {
      Object.keys(options).forEach(function (key) {
        params[key] = options[key];
      });
    }

    return _itemMethodHelper("folder", "create", params, "folder", cb);
  };

  var folderRename = function folderRename(folder_id, name, cb) {
    var params = {
      name: name,
      folder_id: folder_id
    };

    return _itemMethodHelper("folder", "rename", params, "folder", cb);
  };

  var folderDelete = function folderDelete(folder_id, cb) {
    var params = {
      folder_id: folder_id
    };

    return _itemMethodHelper("folder", "delete", params, "result", cb);
  };

  var folderCopy = function folderCopy(folder_id, folder_id_dest, cb) {
    var params = {
      folder_id: folder_id,
      folder_id_dest: folder_id_dest
    };

    return _itemMethodHelper("folder", "copy", params, "result", cb);
  };

  var folderMove = function folderMove(folder_id, folder_id_dest, cb) {
    var params = {
      folder_id: folder_id,
      folder_id_dest: folder_id_dest
    };

    return _itemMethodHelper("folder", "move", params, "result", cb);
  };

  var folderChangeMode = function folderChangeMode(folder_id, mode, cb) {
    var params = {
      folder_id: folder_id,
      mode: mode
    };

    return _itemMethodHelper("folder", "change_mode", params, "folder", cb);
  };

  var trashcanContent = function trashcanContent(cb) {
    return _itemMethodHelper("trashcan", "content", {}, null, cb);
  };

  var trashcanEmpty = function trashcanEmpty(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};

    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("trashcan", "empty", params, "result", cb);
  };

  var trashcanRestore = function trashcanRestore(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};

    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("trashcan", "restore", params, "result", cb);
  };

  var remoteCreate = function remoteCreate(url, options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};

    cb = args.pop();
    if (args.length === 2) {
      params = options;
    }
    params.url = url;

    return _itemMethodHelper("remote", "create", params, "", cb);
  };

  var remoteDelete = function remoteDelete(job_id, cb) {
    var params = {
      job_id: job_id
    };

    return _itemMethodHelper("remote", "delete", params, "result", cb);
  };

  var remoteInfo = function remoteInfo(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};

    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("remote", "info", params, "", cb);
  };

  var onetimeCreate = function onetimeCreate(file_id, options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};

    cb = args.pop();
    if (args.length === 2) {
      params = options;
    }
    params.file_id = file_id;

    return _itemMethodHelper("one_time_download", "create", params, "download", cb);
  };

  var onetimeInfo = function onetimeInfo(options, cb) {
    var args = Array.prototype.slice.call(arguments),
        params = {};
    cb = args.pop();
    if (args.length === 1) {
      params = options;
    }

    return _itemMethodHelper("one_time_download", "info", params, "", cb);
  };

  // this is the entry point for your library
  var AFClient = {
    _setToken: function _setToken(newToken) {
      token = newToken;
    },
    _setBaseUrl: function _setBaseUrl(newBaseUrl) {
      base_url = newBaseUrl;
    },
    ApiError: ApiError,
    NetworkError: NetworkError,
    userLogin: userLogin,
    userInfo: userInfo,
    fileUpload: fileUpload,
    fileRename: fileRename,
    fileDelete: fileDelete,
    fileMove: fileMove,
    fileCopy: fileCopy,
    fileChangeMode: fileChangeMode,
    folderInfo: folderInfo,
    folderContent: folderContent,
    folderCreate: folderCreate,
    folderRename: folderRename,
    folderDelete: folderDelete,
    folderCopy: folderCopy,
    folderMove: folderMove,
    folderChangeMode: folderChangeMode,
    trashcanContent: trashcanContent,
    trashcanEmpty: trashcanEmpty,
    trashcanRestore: trashcanRestore,
    remoteCreate: remoteCreate,
    remoteDelete: remoteDelete,
    remoteInfo: remoteInfo,
    onetimeCreate: onetimeCreate,
    onetimeInfo: onetimeInfo,

    promised: {}
  };

  var except = ["_setToken", "_setBaseUrl", "ApiError", "NetworkError"];
  Object.keys(AFClient).forEach(function (key) {
    var method = AFClient[key];
    // check if it's an API method
    if (except.indexOf(key) >= 0 || typeof method !== "function") {
      return;
    }

    AFClient.promised[key] = function () {
      var args = Array.prototype.slice.call(arguments);
      return new Promise(function (resolve, reject) {
        var cb = function cb(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        };
        args.push(cb);

        AFClient[key].apply(null, args);
      });
    };
  });

  module.exports = AFClient;
});
//# sourceMappingURL=index.js.map