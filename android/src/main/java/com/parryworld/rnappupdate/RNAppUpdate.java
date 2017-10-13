package com.parryworld.rnappupdate;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.support.annotation.Nullable;
import android.util.SparseArray;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.FileNotFoundException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by parryworld on 2016/11/18.
 */


public class RNAppUpdate extends ReactContextBaseJavaModule {

    private String versionName = "1.0.0";
    private int versionCode = 1;

    private SparseArray<Downloader> downloaders = new SparseArray<Downloader>();


    public RNAppUpdate(ReactApplicationContext reactContext) {
        super(reactContext);
        PackageInfo pInfo = null;
        try {
            pInfo = reactContext.getPackageManager().getPackageInfo(reactContext.getPackageName(), 0);
            versionName = pInfo.versionName;
            versionCode = pInfo.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(RCTNativeAppEventEmitter.class)
                .emit(eventName, params);
    }

    private void reject(Promise promise, String filepath, Exception ex) {
        if (ex instanceof FileNotFoundException) {
            rejectFileNotFound(promise, filepath);
            return;
        }

        promise.reject(null, ex.getMessage());
    }

    private void rejectFileNotFound(Promise promise, String filepath) {
        promise.reject("ENOENT", "ENOENT: no such file or directory, open '" + filepath + "'");
    }

    private void rejectFileIsDirectory(Promise promise) {
        promise.reject("EISDIR", "EISDIR: illegal operation on a directory, read");
    }

    @Override
    public String getName() {
        return "RNAppUpdate";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("versionName", versionName);
        constants.put("versionCode", versionCode);
        constants.put("DocumentDirectoryPath", this.getReactApplicationContext().getFilesDir().getAbsolutePath());        
        return constants;
    }

    @ReactMethod
    public void installApk(String file) {
        String cmd = "chmod 777 " + file;
        try {
            Runtime.getRuntime().exec(cmd);
        } catch (Exception e) {
            e.printStackTrace();
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setDataAndType(Uri.parse("file://" + file), "application/vnd.android.package-archive");
        getCurrentActivity().startActivity(intent);
    }

    @ReactMethod
    public void downloadFile(final ReadableMap options, final Promise promise) {
        try {
            File file = new File(options.getString("toFile"));
            URL url = new URL(options.getString("fromUrl"));
            final int jobId = options.getInt("jobId");
            ReadableMap headers = options.getMap("headers");
            int progressDivider = options.getInt("progressDivider");

            DownloadParams params = new DownloadParams();

            params.src = url;
            params.dest = file;
            params.headers = headers;
            params.progressDivider = progressDivider;

            params.onTaskCompleted = new DownloadParams.OnTaskCompleted() {
                public void onTaskCompleted(DownloadResult res) {
                    if (res.exception == null) {
                        WritableMap infoMap = Arguments.createMap();

                        infoMap.putInt("jobId", jobId);
                        infoMap.putInt("statusCode", res.statusCode);
                        infoMap.putInt("bytesWritten", res.bytesWritten);

                        promise.resolve(infoMap);
                    } else {
                        reject(promise, options.getString("toFile"), res.exception);
                    }
                }
            };

            params.onDownloadBegin = new DownloadParams.OnDownloadBegin() {
                public void onDownloadBegin(int statusCode, int contentLength, Map<String, String> headers) {
                    WritableMap headersMap = Arguments.createMap();

                    for (Map.Entry<String, String> entry : headers.entrySet()) {
                        headersMap.putString(entry.getKey(), entry.getValue());
                    }

                    WritableMap data = Arguments.createMap();

                    data.putInt("jobId", jobId);
                    data.putInt("statusCode", statusCode);
                    data.putInt("contentLength", contentLength);
                    data.putMap("headers", headersMap);

                    sendEvent(getReactApplicationContext(), "DownloadBegin-" + jobId, data);
                }
            };

            params.onDownloadProgress = new DownloadParams.OnDownloadProgress() {
                public void onDownloadProgress(int contentLength, int bytesWritten) {
                    WritableMap data = Arguments.createMap();

                    data.putInt("jobId", jobId);
                    data.putInt("contentLength", contentLength);
                    data.putInt("bytesWritten", bytesWritten);

                    sendEvent(getReactApplicationContext(), "DownloadProgress-" + jobId, data);
                }
            };

            Downloader downloader = new Downloader();

            downloader.execute(params);

            this.downloaders.put(jobId, downloader);
        } catch (Exception ex) {
            ex.printStackTrace();
            reject(promise, options.getString("toFile"), ex);
        }
    }

}
