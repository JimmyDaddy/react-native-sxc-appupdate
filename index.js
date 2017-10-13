/**
 * @Author: jimmydaddy
 * @Date:   2017-06-01 08:17:23
 * @Email:  heyjimmygo@gmail.com
 * @Filename: index.js
 * @Last modified by:   jimmydaddy
 * @Last modified time: 2017-06-18 12:29:05
 * @License: GNU General Public License（GPL)
 * @Copyright: ©2015-2017 www.songxiaocai.com 宋小菜 All Rights Reserved.
 */

'use strict'

import {
  NativeModules,
  Platform,
  Linking,
  NativeAppEventEmitter
} from 'react-native'
import 'whatwg-fetch'

const RNAppUpdate = NativeModules.RNAppUpdate

let jobId = 0

const getJobId = () => {
  jobId += 1;
  return jobId;
}

const normalizeFilePath = (path) => (path.startsWith('file://') ? path.slice(7) : path);


/* global fetch */
class AppUpdate {
  constructor (options) {
    this.options = options
  }

  GET (url, success, error) {
    fetch(url)
      .then((response) => response.json())
      .then((json) => {
        success && success(json)
      })
      .catch((err) => {
        error && error(err)
      })
  }

  getApkVersion () {
    if (jobId !== 0) {
      return
    }
    if (!this.options.apkVersionUrl) {
      console.log("apkVersionUrl doesn't exist.")
      return
    }
    this.GET(this.options.apkVersionUrl, this.getApkVersionSuccess.bind(this), this.getVersionError.bind(this))
  }

  downloadFile(options) {
    if (typeof options !== 'object') throw new Error('downloadFile: Invalid value for argument `options`');
    if (typeof options.fromUrl !== 'string') throw new Error('downloadFile: Invalid value for property `fromUrl`');
    if (typeof options.toFile !== 'string') throw new Error('downloadFile: Invalid value for property `toFile`');
    if (options.headers && typeof options.headers !== 'object') throw new Error('downloadFile: Invalid value for property `headers`');
    if (options.background && typeof options.background !== 'boolean') throw new Error('downloadFile: Invalid value for property `background`');
    if (options.progressDivider && typeof options.progressDivider !== 'number') throw new Error('downloadFile: Invalid value for property `progressDivider`');
    if (options.readTimeout && typeof options.readTimeout !== 'number') throw new Error('downloadFile: Invalid value for property `readTimeout`');
    if (options.connectionTimeout && typeof options.connectionTimeout !== 'number') throw new Error('downloadFile: Invalid value for property `connectionTimeout`');

    var jobId = getJobId();
    var subscriptions = [];

    if (options.begin) {
      subscriptions.push(NativeAppEventEmitter.addListener('DownloadBegin-' + jobId, options.begin));
    }

    if (options.progress) {
      subscriptions.push(NativeAppEventEmitter.addListener('DownloadProgress-' + jobId, options.progress));
    }

    var bridgeOptions = {
      jobId: jobId,
      fromUrl: options.fromUrl,
      toFile: normalizeFilePath(options.toFile),
      headers: options.headers || {},
      background: !!options.background,
      progressDivider: options.progressDivider || 0,
      readTimeout: options.readTimeout || 15000,
      connectionTimeout: options.connectionTimeout || 5000
    };

    return {
      jobId,
      promise: RNAppUpdate.downloadFile(bridgeOptions).then(res => {
        subscriptions.forEach(sub => sub.remove());
        return res;
      })
    };
  }

  getApkVersionSuccess (res) {
    const { data } = res
    let remote = res
    if (data) {
      remote = data
    }
    let code = remote.versionCode || remote.appBuild
    if (RNAppUpdate.versionCode < code) {
      if (remote.forceUpdate) {
        if (this.options.forceUpdateApp) {
          this.options.forceUpdateApp(remote)
        }
        this.downloadApk(remote)
      } else if (this.options.needUpdateApp) {
        this.options.needUpdateApp((isUpdate) => {
          if (isUpdate) {
            this.downloadApk(remote)
          }
        }, remote)
      }
    } else if (this.options.notNeedUpdateApp) {
      this.options.notNeedUpdateApp()
    }
  }

  downloadApk (remote) {
    const progress = (data) => {
      const percentage = ((100 * data.bytesWritten) / data.contentLength) | 0
      this.options.downloadApkProgress && this.options.downloadApkProgress(percentage)
    }
    const begin = (res) => {
      this.options.downloadApkStart && this.options.downloadApkStart()
    }
    const progressDivider = 1
    const downloadDestPath = `${RNAppUpdate.DocumentDirectoryPath}/NewApp.apk`
    const ret = this.downloadFile({
      fromUrl: remote.apkUrl,
      toFile: downloadDestPath,
      begin,
      progress,
      background: true,
      progressDivider
    })

    jobId = ret.jobId

    ret.promise.then((res) => {
      this.options.downloadApkEnd && this.options.downloadApkEnd()
      RNAppUpdate.installApk(downloadDestPath)

      jobId = -1
    }).catch((err) => {
      this.downloadApkError(err)

      jobId = -1
    })
  }

  getAppStoreVersion () {
    if (!this.options.iosAppId) {
      console.log("iosAppId doesn't exist.")
      return
    }
    this.GET('https://itunes.apple.com/lookup?id=' + this.options.iosAppId, this.getAppStoreVersionSuccess.bind(this), this.getVersionError.bind(this))
  }

  getAppStoreVersionSuccess (data) {
    if (data.resultCount < 1) {
      console.log('iosAppId is wrong.')
      return
    }
    const result = data.results[0]
    const version = result.version
    const trackViewUrl = result.trackViewUrl
    if (version > RNAppUpdate.versionName) {
      if (this.options.needUpdateApp) {
        this.options.needUpdateApp((isUpdate) => {
          if (isUpdate) {
            RNAppUpdate.installFromAppStore(trackViewUrl)
          }
        }, result)
      }
    } else if (this.options.notNeedUpdateApp) {
      this.options.notNeedUpdateApp()
    }
  }

  getVersionError (err) {
    console.log('getVersionError', err)
  }

  downloadApkError (err) {
    console.log('downloadApkError', err)
    this.options.onError && this.options.onError()
  }

  checkUpdate () {
    if (Platform.OS === 'android') {
      this.getApkVersion()
    } else if (this.options.enterprise && this.options.enterpriseUrl) {
      this.getEnterpriseVersion()
    } else {
      this.getAppStoreVersion()
    }
  }

  getEnterpriseVersion () {
    this.GET(this.options.iosEnterpriseVersionUrl, this.getEnterpriseVersionSuccess.bind(this), this.getVersionError.bind(this))
  }

  getEnterpriseVersionSuccess (remote) {
    var code = remote.appBuild || remote.versionCode
    var updateUrl = remote.updateUrl ? remote.updateUrl : this.options.enterpriseUrl
    if (parseInt(code) > parseInt(RNAppUpdate.versionCode)) {
      if (this.options.needUpdateApp) {
        this.options.needUpdateApp((isUpdate) => {
          if (isUpdate) {
            Linking.openURL(updateUrl)
          }
        }, remote)
      } else if (this.options.notNeedUpdateApp) {
        this.options.notNeedUpdateApp()
      }
    }
  }

  openEnterpriseUrl () {
    Linking.openURL(this.options.enterpriseUrl)
  }

  /**
   * @description get updater
   * @static
   * @memberof AppUpdate
   */
  static getAppUpdater = (options) => {
    if (!AppUpdate.instance) {
      AppUpdate.instance = new AppUpdate(options)
    } else {
      if (options) {
        AppUpdate.instance = new AppUpdate(options)
      }
    }
    return AppUpdate.instance
  }
}

export default AppUpdate
