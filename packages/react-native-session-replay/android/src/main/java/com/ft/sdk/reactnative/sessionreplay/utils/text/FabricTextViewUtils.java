package com.ft.sdk.reactnative.sessionreplay.utils.text;

import android.text.Spannable;
import android.text.style.ForegroundColorSpan;
import android.view.View;
import android.widget.TextView;

import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ColorUtils;
import com.facebook.react.bridge.ReactContext;
import com.ft.sdk.garble.utils.LogUtils;
import com.ft.sdk.sessionreplay.model.TextStyle;
import com.ft.sdk.sessionreplay.model.TextWireframe;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.Locale;

public class FabricTextViewUtils extends TextViewUtils {
  private static final String TAG = "FabricTextViewUtils";
  private final ReactContext reactContext;
  private final InternalLogger logger;

  public FabricTextViewUtils(ReactContext reactContext, InternalLogger logger, DrawableUtils drawableUtils) {
    super(reactContext, drawableUtils);
    this.reactContext = reactContext;
    this.logger = logger;
  }

  @Override
  protected TextStyle resolveTextStyle(TextWireframe textWireframe, float pixelsDensity, TextView view) {
    String fontColor = getTextColor(view, textWireframe);
    Long fontSize = getFontSize(view, pixelsDensity);
    String fontFamily = getFontFamily(textWireframe);
    return new TextStyle(fontFamily, fontSize, fontColor);
  }

  private String getTextColor(TextView view, TextWireframe textWireframe) {
    Spannable spanned = (Spannable) getFieldFromView(view, TextViewUtils.SPANNED_FIELD_NAME);
    ForegroundColorSpan[] spans = spanned != null ? spanned.getSpans(0, spanned.length(), ForegroundColorSpan.class) : null;
    String fontColor = (spans != null && spans.length > 0)
      ? ColorUtils.formatAsRgba(spans[0].getForegroundColor())
      : textWireframe.getTextStyle().getColor();
    return fontColor;
  }

  private Long getFontSize(TextView view, float pixelsDensity) {
    return (long) (view.getTextSize() / pixelsDensity);
  }

  private String getFontFamily(TextWireframe textWireframe) {
    String fontFamily = textWireframe.getTextStyle().getFamily();
    return resolveFontFamily(fontFamily.toLowerCase(Locale.US));
  }

  public Object getFieldFromView(View view, String value) {
    try {
      java.lang.reflect.Field field = view.getClass().getDeclaredField(value);
      field.setAccessible(true);
      return field.get(view);
    } catch (Exception e) {
      handleError(e, TextViewUtils.RESOLVE_FABRICFIELD_ERROR);
      return null;
    }
  }

  private void handleError(Exception e, String message) {
    logger.w(TAG, "message:" + message + "," + LogUtils.getStackTraceString(e));
  }
}
