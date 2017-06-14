/**
 * @Author: jimmydaddy
 * @Date:   2017-06-01 08:17:23
 * @Email:  heyjimmygo@gmail.com
 * @Filename: index.js
 * @Last modified by:   jimmydaddy
 * @Last modified time: 2017-06-14 05:38:58
 * @License: GNU General Public License（GPL)
 * @Copyright: ©2015-2017 www.songxiaocai.com 宋小菜 All Rights Reserved.
 */



'use strict';

import {
  NativeModules,
  Platform,
  Linking
} from 'react-native';
import RNFS from 'react-native-fs';

const RNAppUpdate = NativeModules.RNAppUpdate;

const jobId = -1;

class AppUpdate {
  constructor(options) {
    this.options = options;
  }

  GET(url, success, error) {
    fetch(url)
      .then((response) => response.json())
      .then((json) => {
        success && success(json);
      })
      .catch((err) => {
        error && error(err);
      });
  }

  getApkVersion() {
    if (jobId !== -1) {
      return;
    }
    if (!this.options.apkVersionUrl) {
      console.log("apkVersionUrl doesn't exist.");
      return;
    }
    this.GET(this.options.apkVersionUrl, this.getApkVersionSuccess.bind(this), this.getVersionError.bind(this));
  }

  getApkVersionSuccess(remote) {
    if (RNAppUpdate.versionCode < remote.versionCode) {
      if (remote.forceUpdate) {
        if(this.options.forceUpdateApp) {
          this.options.forceUpdateApp();
        }
        this.downloadApk(remote);
      } else if (this.options.needUpdateApp) {
        this.options.needUpdateApp((isUpdate) => {
          if (isUpdate) {
            this.downloadApk(remote);
          }
        }, remote);
      }
    } else if(this.options.notNeedUpdateApp) {
      this.options.notNeedUpdateApp();
    }
  }

  downloadApk(remote) {
    const progress = (data) => {
      const percentage = ((100 * data.bytesWritten) / data.contentLength) | 0;
      this.options.downloadApkProgress && this.options.downloadApkProgress(percentage);
    };
    const begin = (res) => {
      this.options.downloadApkStart && this.options.downloadApkStart();
    };
    const progressDivider = 1;
    const downloadDestPath = `${RNFS.DocumentDirectoryPath}/NewApp.apk`;
    const ret = RNFS.downloadFile({
      fromUrl: remote.apkUrl,
      toFile: downloadDestPath,
      begin,
      progress,
      background: true,
      progressDivider
    });

    jobId = ret.jobId;

    ret.promise.then((res) => {
      this.options.downloadApkEnd && this.options.downloadApkEnd();
      RNAppUpdate.installApk(downloadDestPath);

      jobId = -1;
    }).catch((err) => {
      this.downloadApkError(err);

      jobId = -1;
    });
  }

  getAppStoreVersion() {
    if (!this.options.iosAppId) {
      console.log("iosAppId doesn't exist.");
      return;
    }
    this.GET("https://itunes.apple.com/lookup?id=" + this.options.iosAppId, this.getAppStoreVersionSuccess.bind(this), this.getVersionError.bind(this));
  }

  getAppStoreVersionSuccess(data) {
    if (data.resultCount < 1) {
      console.log("iosAppId is wrong.");
      return;
    }
    const result = data.results[0];
    const version = result.version;
    const trackViewUrl = result.trackViewUrl;
    if (version !== RNAppUpdate.versionName) {
      if (this.options.needUpdateApp) {
        this.options.needUpdateApp((isUpdate) => {
          if (isUpdate) {
            RNAppUpdate.installFromAppStore(trackViewUrl);
          }
        }, result);
      }
    } else if(this.options.notNeedUpdateApp) {
      this.options.notNeedUpdateApp();
    }
  }

  getVersionError(err) {
    console.log("getVersionError", err);
  }

  downloadApkError(err) {
    console.log("downloadApkError", err);
    this.options.onError && this.options.onError();
  }

  checkUpdate() {
    if (Platform.OS === 'android') {
      this.getApkVersion();
    } else if (this.options.enterprise && this.options.enterpriseUrl) {
      this.getEnterpriseVersion();
    } else {
      this.getAppStoreVersion();
    }
  }

  getEnterpriseVersion() {
      this.GET(this.options.iosEnterpriseVersionUrl, this.getEnterpriseVersionSuccess.bind(this),this.getVersionError.bind(this))
  }

  getEnterpriseVersionSuccess(remote){
      var code = remote.appBuild;
      var updateUrl = remote.updateUrl? remote.updateUrl : this.options.enterpriseUrl;
      if(parseInt(code) > parseInt(RNAppUpdate.versionCode)){
          if (this.options.needUpdateApp) {
            this.options.needUpdateApp((isUpdate) => {
              if (isUpdate) {
                  Linking.openURL(updateUrl);
              }
            }, remote);
          } else if(this.options.notNeedUpdateApp) {
              this.options.notNeedUpdateApp();
          }

      }
  }

  openEnterpriseUrl(){
      Linking.openURL(this.options.enterpriseUrl);
  }
}

export default AppUpdate;
