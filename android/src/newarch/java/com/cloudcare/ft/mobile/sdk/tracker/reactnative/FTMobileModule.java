import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

@ReactModule(name = FTLogModule.NAME)
public class FTLogModule extends NativeFTLogSpec {
  private final FTMobileImpl impl = new FTMobileImpl();

  @ReactMethod
  public void sdkConfig(ReadableMap context, Promise promise) {
    impl.sdkConfig(context, promise);
  }

  @ReactMethod
  public void bindRUMUserData(String userId, String userName, String userEmail, ReadableMap extra, Promise promise) {
    impl.bindRUMUserData(userId, userName, userEmail, extra, promise);
  }

  @ReactMethod
  public void unbindRUMUserData(Promise promise) {
    impl.unbindRUMUserData(promise);
  }

  @ReactMethod
  public void flushSyncData(Promise promise) {
    impl.flushSyncData(promise);
  }

  @ReactMethod
  public void appendGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendGlobalContext(extra, promise);
  }

  @ReactMethod
  public void appendLogGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendLogGlobalContext(extra, promise);
  }

  @ReactMethod
  public void appendRUMGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendRUMGlobalContext(extra, promise);
  }

  @ReactMethod
  public void shutDown(Promise promise) {
    impl.shutDown(promise);
  }

  @ReactMethod
  public void clearAllData(Promise promise) {
    impl.clearAllData(promise);
  }
}
