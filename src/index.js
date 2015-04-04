var protocol = window.location.href.split('://')[0];
if (protocol === 'file') { protocol = 'http'; }

var base_url = `${protocol}://alfafile.net/api/v1`;

var token = '';

const UPL_STATE_UPLOADING = 0;
const UPL_STATE_PROCESSING = 1;
const UPL_STATE_DONE = 2;
const UPL_STATE_FAIL = 3;

class ApiError extends Error {
  constructor(message) {
    super();
    this.name = 'ApiError';
    this.message = message;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super();
    this.name = 'NetworkError';
    this.message = message;
  }
}


var _doCheckUploadState = function(params, upload_id, cb) {
  params.token = params.token || token;

  let params_str = 'upload_id=' + (encodeURIComponent(upload_id));
  params_str += '&token=' + (encodeURIComponent(params.token));

  var check_int = setInterval(() => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', `${base_url}/file/upload_info?${params_str}`, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        let data = JSON.parse(xhr.responseText);
        if (data.response.upload.state !== UPL_STATE_PROCESSING) {
          if (cb && typeof cb === 'function') {
            clearInterval(check_int);
            return cb(null, data.response.upload);
          }
        }
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        if (cb && typeof cb === 'function') {
          return cb(new NetworkError('NetworkError'));
        }
      }
    };
    xhr.send();
  }, 1000);
};

var _doFileUpload = function(params, upload_url, cb) {
  let form_data = new FormData();
  
  form_data.append('file', params.file);
  form_data.append('token', params.token || token);

  let upload_progress = function(event) {
    if (event.lengthComputable) {
      if (params.progress_cb && typeof params.progress_cb === 'function') {
        return params.progress_cb(Math.ceil(event.loaded / event.total * 100));
      }
    }
  };

  let xhr = new XMLHttpRequest();
  xhr.open('POST', upload_url, true);
  xhr.upload.onprogress = upload_progress;
  if (params.abort_cb && typeof params.abort_cb === 'function') {
    xhr.onabort = params.abort_cb;
  }

  xhr.onreadystatechange = function() {
    var data, response;
    if (xhr.readyState === 4 && xhr.status === 200) {
      data = JSON.parse(xhr.responseText);
      response = data.response;
      if (data.status === 200) {
        return _doCheckUploadState(params, response.upload.upload_id, cb);
      } else {
        if (cb && typeof cb === 'function') {
          return cb(new ApiError('' + (data ? data.details : '')));
        }
      }
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      if (cb && typeof cb === 'function') {
        return cb(new NetworkError('Network error'));
      }
    }
  };

  xhr.send(form_data);

  if (params.upload_xhr_available && typeof params.upload_xhr_available === 'function') {
    return params.upload_xhr_available(xhr);
  }
};

var _itemMethodHelper = function(itype, method, params, response_field, cb) {
  params = params || {};
  params.token = params.token || token;

  let params_str = '';
  Object.keys(params).forEach(key => {
    let val = params[key];
    if (typeof val !== 'function') {
      params_str += `${key}=${encodeURIComponent(val)}&`;
    }
  });

  let xhr = new XMLHttpRequest();
  xhr.open('GET', `${base_url}/${itype}/${method}?${params_str}`, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      let data = JSON.parse(xhr.responseText);

      if (data.status === 200 && data.response) {
        // return the default result or a special field?
        let result = response_field ? data.response[response_field] : data.response;

        // two-level method or not?
        let twolevel = false;

        if (itype === 'user' && method === 'login') {
          token = data.response.token; // set global token on login
        } else if (itype === 'file' && method === 'upload') { // file upload method
          let up_state = data.response.upload.state;
          if (up_state === UPL_STATE_UPLOADING) {
            twolevel = true; // it's a two-level operation
            _doFileUpload(params, data.response.upload.url, cb);
          }
        }
        // by default: call passed callback with a response result
        if (cb && typeof cb === 'function' && !twolevel) {
          cb(null, result);
        }
      } else {
        // once the response status in not 200, we should pass an ApiError to callback
        if (cb && typeof cb === 'function') {
          cb(new ApiError('' + (data ? data.details : '')));
        }
      }
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      if (cb && typeof cb === 'function') {
        cb(new NetworkError('Network error'));
      }
    }
  };

  xhr.send();
};

var userLogin = function(login, password, cb) {
  return _itemMethodHelper('user', 'login', {
    login: login,
    password: password
  }, 'user', cb);
};

var userInfo = function(cb) {
  return _itemMethodHelper('user', 'info', {}, 'user', cb);
};

var fileUpload = function(name, hash, size, file, options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};
  cb = args.pop();

  if (args.length === 5) {
    params = options;
  }

  params.name = name;
  params.hash = hash;
  params.size = size;
  params.file = file;

  return _itemMethodHelper('file', 'upload', params, 'upload', cb);
};

var fileRename = function(file_id, name, cb) {
  let params = {
    file_id: file_id,
    name: name
  };
  return _itemMethodHelper('file', 'rename', params, 'file', cb);
};

var fileDelete = function(file_id, cb) {
  let params = {
    file_id: file_id
  };
  return _itemMethodHelper('file', 'delete', params, 'result', cb);
};

var fileCopy = function(file_id, folder_id_dest, cb) {
  let params = {
    file_id: file_id,
    folder_id_dest: folder_id_dest
  };
  return _itemMethodHelper('file', 'copy', params, 'result', cb);
};

var fileMove = function(file_id, folder_id_dest, cb) {
  let params = {
    file_id: file_id,
    folder_id_dest: folder_id_dest
  };
  return _itemMethodHelper('file', 'move', params, 'result', cb);
};

var fileChangeMode = function(file_id, mode, cb) {
  let params = {
    file_id: file_id,
    mode: mode
  };
  return _itemMethodHelper('file', 'change_mode', params, 'file', cb);
};

var folderInfo = function(options, cb) {
  let args = Array.prototype.slice.call(arguments),
      params = {};
  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('folder', 'info', params, 'folder', cb);
};

var folderContent = function(options, cb) {
  let args = Array.prototype.slice.call(arguments),
      params = {};
  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('folder', 'content', params, 'folder', cb);
};

var folderCreate = function(name, options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {name: name};
  
  cb = args.pop();
  if (args.length === 2) {
    Object.keys(options).forEach(key => {
      params[key] = options[key];
    });
  }

  return _itemMethodHelper('folder', 'create', params, 'folder', cb);
};

var folderRename = function(folder_id, name, cb) {
  var params = {
    name: name,
    folder_id: folder_id
  };

  return _itemMethodHelper('folder', 'rename', params, 'folder', cb);
};

var folderDelete = function(folder_id, cb) {
  var params = {
    folder_id: folder_id
  };

  return _itemMethodHelper('folder', 'delete', params, 'result', cb);
};

var folderCopy = function(folder_id, folder_id_dest, cb) {
  var params = {
    folder_id: folder_id,
    folder_id_dest: folder_id_dest
  };

  return _itemMethodHelper('folder', 'copy', params, 'result', cb);
};

var folderMove = function(folder_id, folder_id_dest, cb) {
  var params = {
    folder_id: folder_id,
    folder_id_dest: folder_id_dest
  };

  return _itemMethodHelper('folder', 'move', params, 'result', cb);
};

var folderChangeMode = function(folder_id, mode, cb) {
  var params = {
    folder_id: folder_id,
    mode: mode
  };

  return _itemMethodHelper('folder', 'change_mode', params, 'folder', cb);
};

var trashcanContent = function(cb) {
  return _itemMethodHelper('trashcan', 'content', {}, null, cb);
};

var trashcanEmpty = function(options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};

  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('trashcan', 'empty', params, 'result', cb);
};

var trashcanRestore = function(options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};

  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('trashcan', 'restore', params, 'result', cb);
};

var remoteCreate = function(url, options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};

  cb = args.pop();
  if (args.length === 2) {
    params = options;
  }
  params.url = url;

  return _itemMethodHelper('remote', 'create', params, '', cb);
};

var remoteDelete = function(job_id, cb) {
  var params = {
    job_id: job_id
  };

  return _itemMethodHelper('remote', 'delete', params, 'result', cb);
};

var remoteInfo = function(options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};

  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('remote', 'info', params, '', cb);
};

var onetimeCreate = function(file_id, options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};

  cb = args.pop();
  if (args.length === 2) {
    params = options;
  }
  params.file_id = file_id;

  return _itemMethodHelper('one_time_download', 'create', params, 'download', cb);
};

var onetimeInfo = function(options, cb) {
  let args = Array.prototype.slice.call(arguments), 
      params = {};
  cb = args.pop();
  if (args.length === 1) {
    params = options;
  }

  return _itemMethodHelper('one_time_download', 'info', params, '', cb);
};


// this is the entry point for your library
var AFClient = {
  _setToken: function(newToken) {
    token = newToken;
  },
  _setBaseUrl: function(newBaseUrl) {
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

let except = ['_setToken', '_setBaseUrl', 'ApiError', 'NetworkError'];
Object.keys(AFClient).forEach(key => {
  let method = AFClient[key];
  // check if it's an API method
  if (except.indexOf(key) >= 0 || typeof method !== 'function') {
    return;
  }

  AFClient.promised[key] = function() {
    let args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      let cb = function (err, result) {
        if (err) { reject(err); } else { resolve(result); }
      };
      args.push(cb);

      AFClient[key].apply(null, args);
    });
  };
});

export default AFClient;
