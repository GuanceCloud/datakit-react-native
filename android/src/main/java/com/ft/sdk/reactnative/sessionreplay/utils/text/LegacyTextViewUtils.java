package com.ft.sdk.reactnative.sessionreplay.utils.text;

import android.widget.TextView;

import com.ft.sdk.reactnative.sessionreplay.ShadowNodeWrapper;
import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReflectionUtils;
import com.ft.sdk.reactnative.utils.ColorUtils;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.views.text.TextAttributes;
import com.ft.sdk.garble.utils.LogUtils;
import com.ft.sdk.sessionreplay.model.TextStyle;
import com.ft.sdk.sessionreplay.model.TextWireframe;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.Locale;

public class LegacyTextViewUtils extends TextViewUtils {
  private static final String TAG = "LegacyTextViewUtils";
  private final ReactContext reactContext;
  private final InternalLogger logger;
  private final ReflectionUtils reflectionUtils;
  private UIManagerModule uiManager;

  public LegacyTextViewUtils(ReactContext reactContext, InternalLogger logger, ReflectionUtils reflectionUtils, DrawableUtils drawableUtils) {
    super(reactContext, drawableUtils);
    this.reactContext = reactContext;
    this.logger = logger;
    this.reflectionUtils = reflectionUtils;
    this.uiManager = getUiManagerModule();
  }

  @Override
  protected TextStyle resolveTextStyle(TextWireframe textWireframe, float pixelsDensity, TextView view) {
    ShadowNodeWrapper shadowNodeWrapper = ShadowNodeWrapper.getShadowNodeWrapper(
      reactContext,
      uiManager,
      reflectionUtils,
      view.getId()
    );
    if (shadowNodeWrapper == null) return null;
    String fontFamily = getFontFamily(shadowNodeWrapper);
    if (fontFamily == null) fontFamily = textWireframe.getTextStyle().getFamily();
    Long fontSize = getFontSize(shadowNodeWrapper);
    if (fontSize != null) {
      fontSize = (long) (fontSize / pixelsDensity);
    } else {
      fontSize = textWireframe.getTextStyle().getSize();
    }
    String fontColor = getTextColor(shadowNodeWrapper);
    if (fontColor == null) fontColor = textWireframe.getTextStyle().getColor();
    return new TextStyle(fontFamily, fontSize, fontColor);
  }

  private String getTextColor(ShadowNodeWrapper shadowNodeWrapper) {
    if (shadowNodeWrapper == null) return null;
    Boolean isColorSet = (Boolean) shadowNodeWrapper.getDeclaredShadowNodeField(TextViewUtils.IS_COLOR_SET_FIELD_NAME);
    if (isColorSet == null || !isColorSet) {
      return "#000000FF";
    }
    Integer resolvedColor = (Integer) shadowNodeWrapper.getDeclaredShadowNodeField(TextViewUtils.COLOR_FIELD_NAME);
    if (resolvedColor != null) {
      return ColorUtils.formatAsRgba(resolvedColor);
    }
    return null;
  }

  private Long getFontSize(ShadowNodeWrapper shadowNodeWrapper) {
    if (shadowNodeWrapper == null) return null;
    TextAttributes textAttributes = (TextAttributes) shadowNodeWrapper.getDeclaredShadowNodeField(TextViewUtils.TEXT_ATTRIBUTES_FIELD_NAME);
    if (textAttributes != null) {
      return (long) textAttributes.getEffectiveFontSize();
    }
    return null;
  }

  private String getFontFamily(ShadowNodeWrapper shadowNodeWrapper) {
    if (shadowNodeWrapper == null) return null;
    String fontFamily = (String) shadowNodeWrapper.getDeclaredShadowNodeField(TextViewUtils.FONT_FAMILY_FIELD_NAME);
    if (fontFamily != null) {
      return resolveFontFamily(fontFamily.toLowerCase(Locale.US));
    }
    return null;
  }

  private UIManagerModule getUiManagerModule() {
    try {
      return reactContext.getNativeModule(UIManagerModule.class);
    } catch (IllegalStateException e) {
      logger.w(
        TAG, TextViewUtils.RESOLVE_UIMANAGERMODULE_ERROR + ":" + LogUtils.getStackTraceString(e)
      );
      return null;
    }
  }
}
