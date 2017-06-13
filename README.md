# React Native AppUpdate
Update apk and update from app store in React Native.

## Installation
```bash
npm install react-native-sxc-appupdate --save
```
Adding automatically with react-native link

```bash
react-native link react-native-sxc-appupdate
react-native link react-native-fs
```
## Usage
```javascript
import { Alert } from 'react-native';
import AppUpdate from 'react-native-sxc-appupdate';

let appUpdate = new AppUpdate({
    apkVersionUrl: 'url',
    iosAppId: '',
    enterprise: true,
    enterpriseUrl: 'url',
    iosEnterpriseVersionUrl: 'url',
    needUpdateApp: (needUpdate, remoteData) => {
        Alert.alert(
          '有新版本啦,是否立即更新？',
          remoteData.attention? remoteData.attention : '无特别说明',
          [
            {text: '取消', onPress: () => {}},
            {text: '更新', onPress: () => needUpdate(true)}
          ]
        );
    },
    forceUpdateApp: () => {
        console.log("Force update will start")
    },
    notNeedUpdateApp: () => {
        console.log("App is up to date")
    },
    downloadApkStart: () => {
        this.changeState({
            showDownLoad: true
        })
    },
    downloadApkProgress: (progress) => {
        this.changeState({
            downloadProgress: progress,
        })
    },
    downloadApkEnd: () => {
        console.log("End")
        this.changeState({
            showDownLoad: false
        })
    },
    onError: () => {
        Alert.alert(
          '下载出错',
          '请检查您的网络设置',
        );
    },

});

appUpdate.checkUpdate();
```

```javascript
// version.json
{
  "versionName":"1.0.0",
  "apkUrl":"https://github.com/NewApp.apk",
  "forceUpdate": false
}
```
## Third Library
* react-native-fs
