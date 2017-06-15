# React Native AppUpdate
Update apk and update from app store in React Native. Based on [react-native-appupdate]('https://github.com/parryworld/react-native-appupdate')

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
      needUpdateApp: (needUpdate, remoteData) => {
        let updateText = 'fix something';
        if (remoteData.attention) {
          updateText = remoteData.attention;
        } else if (remoteData.releaseNotes) {
          updateText = remoteData.releaseNotes;
        }
          Alert.alert(
            'new version available',
            updateText,
            [
              {text: 'cancle', onPress: () => {}},
              {text: 'update', onPress: () => needUpdate(true)}
            ]
          );
      },
    },
    forceUpdateApp: () => {
        console.log("Force update will start")
    },
    notNeedUpdateApp: () => {
        console.log("App is up to date")
    },
    downloadApkStart: () => {
        //TODO
    },
    downloadApkProgress: (progress) => {
        //TODO
    },
    downloadApkEnd: () => {
        //TODO
    },
    onError: () => {
        //TODO
    },

});

appUpdate.checkUpdate();
```

```javascript
// version.json
{
  "versionName":"1.0.0",
  "apkUrl":"https://github.com/NewApp.apk",
  "forceUpdate": false,
  "versionCode": 12 // or appBuild: 12,
  "attention": 'fix something horrible', // or releaseNotes: 'fix something horrible'
}
```
## Third Library
* react-native-fs
