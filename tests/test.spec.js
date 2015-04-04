/* global AFClient */
'use strict';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;

require('babel/polyfill');

var _apiUrl = function(tail) {
  return 'http://alfafile.net/api/v1' + tail + 'token=&';
};

var _recentUrl = function() {
  return jasmine.Ajax.requests.mostRecent().url;
};

describe('Public method list', function() {
  var methods = ['userLogin', 'userInfo', 'fileUpload', 'fileRename', 'fileDelete', 'fileMove',
                 'fileCopy', 'fileChangeMode', 'folderInfo', 'folderContent', 'folderCreate',
                 'folderRename', 'folderDelete', 'folderCopy', 'folderMove', 'trashcanContent',
                 'trashcanEmpty', 'trashcanRestore', 'remoteCreate', 'remoteDelete', 'remoteInfo'];

  var promiseApis = AFClient.promised;

  beforeEach(function() {
    jasmine.Ajax.install();
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it('should check if all the public methods are there', function() {
    expect(AFClient).toBeDefined();
    expect(AFClient._setToken).toBeDefined();
    expect(AFClient._setBaseUrl).toBeDefined();
    expect(AFClient.ApiError).toBeDefined();
    expect(AFClient.NetworkError).toBeDefined();

    methods.forEach(function(methodName) {
      expect(AFClient[methodName]).toBeDefined();
      expect(AFClient.promised[methodName]).toBeDefined();
    });
  });


  // USER METHODS

  it('should throw error for invalid creds over promised userLogin()', function() {
    promiseApis.userLogin('hello', 'there').then(function(result) {
    }).catch(function(err) {
      // expect(err instanceof AFClient.ApiError).toEqual(true);
    });

    expect(jasmine.Ajax.requests.mostRecent().url).toBe(
      _apiUrl('/user/login?login=hello&password=there&')
    );
  });

  it('should fetch user info with valid creds over promised userInfo', function() {
    promiseApis.userInfo().then(function(result) {
    }).catch(function(err) {});

    expect(_recentUrl()).toBe(_apiUrl('/user/info?'));
  });


  // FOLDER METHODS

  it('should send the ROOT folder contents on folderContent()', function() {
    promiseApis.folderContent().then(function(result) { }).catch(function(err) { });
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/content?'));
  });

  it('should send valid request on folderContent() with params', function() {
    promiseApis.folderContent({folder_id: 'fff'}).then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/content?folder_id=fff&'));
  });

  it('should send valid request on folderInfo() with params', function() {
    promiseApis.folderInfo({folder_id: 'fff'}).then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/info?folder_id=fff&'));
  });

  it('should send valid request on folderCreate()', function() {
    promiseApis.folderCreate('fff', { parent_folder_id: 'aaa'}).then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/create?name=fff&parent_folder_id=aaa&'));
  });

  it('should send valid request on folderInfo() with params', function() {
    promiseApis.folderInfo({folder_id: 'fff'}).then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/info?folder_id=fff&'));
  });

  it('should send valid request on folderRename() with params', function() {
    promiseApis.folderRename('fff', 'newName').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/rename?name=newName&folder_id=fff&'));
  });

  it('should send valid request on folderDelete() with params', function() {
    promiseApis.folderDelete('fff').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/delete?folder_id=fff&'));
  });

  it('should send valid request on folderCopy() with params', function() {
    promiseApis.folderCopy('fff', 'where').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/copy?folder_id=fff&folder_id_dest=where&'));
  });

  it('should send valid request on folderMove() with params', function() {
    promiseApis.folderMove('fff', 'where').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/move?folder_id=fff&folder_id_dest=where&'));
  });

  it('should send valid request on folderChangeMode() with params', function() {
    promiseApis.folderChangeMode('fff', 1).then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/folder/change_mode?folder_id=fff&mode=1&'));
  });



  // FILE METHODS

  it('should send rename file request on fileRename() with params', function() {
    promiseApis.fileRename('w2', 'newName').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/file/rename?file_id=w2&name=newName&'));
  });

  it('should send copy file request on fileCopy() with params', function() {
    promiseApis.fileCopy('w2', 'foldrId').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/file/copy?file_id=w2&folder_id_dest=foldrId&'));
  });

  it('should send move file request on fileMove() with params', function() {
    promiseApis.fileMove('w2', 'foldrId').then(function(result) {
    }).catch(function(err) {});
    
    expect(_recentUrl()).toBe(_apiUrl('/file/move?file_id=w2&folder_id_dest=foldrId&'));
  });

  it('should send change mode file request on fileChangeMode() with params', function() {
    promiseApis.fileChangeMode('w2', 3).then(function(result) {
    }).catch(function(err) { });
    
    expect(_recentUrl()).toBe(_apiUrl('/file/change_mode?file_id=w2&mode=3&'));
  });

  it('should send delete file request on fileDelete() with params', function() {
    promiseApis.fileDelete('w2').then(function(result) {
    }).catch(function(err) { });
    
    expect(_recentUrl()).toBe(_apiUrl('/file/delete?file_id=w2&'));
  });



  // it('should fetch the folder contents on folderContent()', function(done) {
  //   AFClient.promised.folderContent().then(function(result) {
  //     expect(result.folder_id).toBeDefined();
  //     expect(result.mode).toBeDefined();
  //     expect(result.mode_label).toBeDefined();
  //     expect(result.parent_folder_id).toBeDefined();
  //     expect(result.name).toBeDefined();
  //     expect(result.url).toBeDefined();
  //     expect(result.nb_folders).toBeDefined();
  //     expect(result.nb_files).toBeDefined();
  //     expect(result.created).toBeDefined();
  //     expect(result.folders).toBeDefined();
  //     expect(result.folders.length).toEqual(result.nb_folders);
  //     expect(result.files.length).toEqual(result.nb_files);
  //     done();
  //   }).catch(function(err) {
  //     // console.error(err);
  //     // done();
  //   });
  // });
});