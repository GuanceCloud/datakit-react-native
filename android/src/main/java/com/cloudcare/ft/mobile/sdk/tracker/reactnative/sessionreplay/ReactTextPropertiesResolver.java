/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay;

import android.view.Gravity;
import android.widget.TextView;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.DrawableUtils;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReflectionUtils;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ColorUtils;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.views.text.TextAttributes;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import com.ft.sdk.sessionreplay.model.Alignment;
import com.ft.sdk.sessionreplay.model.Horizontal;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;
import com.ft.sdk.sessionreplay.model.TextPosition;
import com.ft.sdk.sessionreplay.model.TextStyle;
import com.ft.sdk.sessionreplay.model.TextWireframe;
import com.ft.sdk.sessionreplay.model.Vertical;
import com.ft.sdk.sessionreplay.utils.Utils;

import java.util.Locale;

public class ReactTextPropertiesResolver implements TextPropertiesResolver {
  private final ReactContext reactContext;
  private final UIManagerModule uiManagerModule;
  private final ReflectionUtils reflectionUtils;
  private final ReactViewBackgroundDrawableUtils reactViewBackgroundDrawableUtils;
  private final DrawableUtils drawableUtils;

  public static final String TEXT_ATTRIBUTES_FIELD_NAME = "mTextAttributes";
  public static final String FONT_FAMILY_FIELD_NAME = "mFontFamily";
  public static final String COLOR_FIELD_NAME = "mColor";
  public static final String IS_COLOR_SET_FIELD_NAME = "mIsColorSet";
  public static final String MONOSPACE_FAMILY_NAME = "monospace";

  private static final String ROBOTO_TYPEFACE_NAME = "roboto";
  private static final String SERIF_FAMILY_NAME = "serif";
  private static final String SANS_SERIF_FAMILY_NAME = "roboto, sans-serif";

  public ReactTextPropertiesResolver(ReactContext reactContext, UIManagerModule uiManagerModule) {
    this(reactContext, uiManagerModule, new ReflectionUtils(), new ReactViewBackgroundDrawableUtils(), new DrawableUtils());
  }

  public ReactTextPropertiesResolver(ReactContext reactContext, UIManagerModule uiManagerModule, ReflectionUtils reflectionUtils, ReactViewBackgroundDrawableUtils reactViewBackgroundDrawableUtils, DrawableUtils drawableUtils) {
    this.reactContext = reactContext;
    this.uiManagerModule = uiManagerModule;
    this.reflectionUtils = reflectionUtils;
    this.reactViewBackgroundDrawableUtils = reactViewBackgroundDrawableUtils;
    this.drawableUtils = drawableUtils;
  }

  @Override
  public TextWireframe addReactNativeProperties(TextWireframe originalWireframe, TextView view, float pixelDensity) {
    ShapeAndBorder shapeAndBorder = resolveShapeStyleAndBorder(view, pixelDensity);
    ShapeStyle shapeStyle = shapeAndBorder != null ? shapeAndBorder.shapeStyle : originalWireframe.getShapeStyle();
    ShapeBorder border = shapeAndBorder != null ? shapeAndBorder.border : originalWireframe.getBorder();

    TextStyleAndPosition textStyleAndPosition = resolveTextStyleAndPosition(originalWireframe, view, pixelDensity);
    TextStyle textStyle = textStyleAndPosition != null ? textStyleAndPosition.textStyle : originalWireframe.getTextStyle();
    TextPosition textPosition = textStyleAndPosition != null ? textStyleAndPosition.textPosition : originalWireframe.getTextPosition();

    // nothing changed, return the original wireframe
    if (shapeStyle == originalWireframe.getShapeStyle()
      && border == originalWireframe.getBorder()
      && textStyle == originalWireframe.getTextStyle()
      && textPosition == originalWireframe.getTextPosition()) {
      return originalWireframe;
    }

    originalWireframe.setTextStyle(textStyle);
    originalWireframe.setShapeStyle(shapeStyle);
    originalWireframe.setTextPosition(textPosition);
    originalWireframe.setBorder(border);
    return originalWireframe;
  }

  private TextStyleAndPosition resolveTextStyleAndPosition(TextWireframe originalWireframe, TextView view, float pixelDensity) {
    if (!reactContext.hasActiveReactInstance()) {
      return null;
    }

    ShadowNodeWrapper shadowNodeWrapper = ShadowNodeWrapper.getShadowNodeWrapper(
      reactContext,
      uiManagerModule,
      reflectionUtils,
      view.getId()
    );
    if (shadowNodeWrapper == null) {
      return null;
    }

    TextStyle textStyle = resolveTextStyle(originalWireframe, pixelDensity, shadowNodeWrapper);
    Alignment alignment = resolveTextAlignment(view, originalWireframe);

    TextPosition textPosition = new TextPosition(
      originalWireframe.getTextPosition() != null ? originalWireframe.getTextPosition().getPadding() : null,
      alignment
    );

    return new TextStyleAndPosition(textStyle, textPosition);
  }

  private ShapeAndBorder resolveShapeStyleAndBorder(TextView view, float pixelDensity) {
    ReactViewBackgroundDrawable backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.getBackground());
    if (backgroundDrawable == null) {
      return null;
    }

    // view.alpha is the value of the opacity prop on the js side
    float opacity = view.getAlpha();

    ReactViewBackgroundDrawableUtils.ShapeAndBorder shapeAndBorder = reactViewBackgroundDrawableUtils.resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity);

    return new ShapeAndBorder(shapeAndBorder.getShapeStyle(), shapeAndBorder.getBorder());
  }

  private Alignment resolveTextAlignment(TextView view, TextWireframe textWireframe) {
    int gravity = view.getGravity();
    Horizontal horizontal = textWireframe.getTextPosition() != null && textWireframe.getTextPosition().getAlignment() != null ? textWireframe.getTextPosition().getAlignment().getHorizontal() : null;
    Vertical vertical;
    switch (gravity & Gravity.VERTICAL_GRAVITY_MASK) {
      case Gravity.TOP:
        vertical = Vertical.TOP;
        break;
      case Gravity.CENTER_VERTICAL:
      case Gravity.CENTER:
        vertical = Vertical.CENTER;
        break;
      case Gravity.BOTTOM:
        vertical = Vertical.BOTTOM;
        break;
      default:
        vertical = Vertical.TOP;
    }

    return new Alignment(horizontal, vertical);
  }

  private TextStyle resolveTextStyle(TextWireframe textWireframe, float pixelsDensity, ShadowNodeWrapper shadowNodeWrapper) {
    String fontFamily = getFontFamily(shadowNodeWrapper);
    if (fontFamily == null) {
      fontFamily = textWireframe.getTextStyle().getFamily();
    }

    Long fontSize = getFontSize(shadowNodeWrapper);
    if (fontSize != null) {
      fontSize = Utils.densityNormalized(fontSize, pixelsDensity);
    } else {
      fontSize = textWireframe.getTextStyle().getSize();
    }

    String fontColor = getTextColor(shadowNodeWrapper);
    if (fontColor == null) {
      fontColor = textWireframe.getTextStyle().getColor();
    }

    return new TextStyle(fontFamily, fontSize, fontColor);
  }

  private String getTextColor(ShadowNodeWrapper shadowNodeWrapper) {
    Boolean isColorSet = (Boolean) shadowNodeWrapper.getDeclaredShadowNodeField(IS_COLOR_SET_FIELD_NAME);
    if (isColorSet == null || !isColorSet) {
      // Improvement: get default text color if different from black
      return "#000000FF";
    }
    Integer resolvedColor = (Integer) shadowNodeWrapper.getDeclaredShadowNodeField(COLOR_FIELD_NAME);
    if (resolvedColor != null) {
      return ColorUtils.formatAsRgba(resolvedColor);
    }

    return null;
  }

  private Long getFontSize(ShadowNodeWrapper shadowNodeWrapper) {
    TextAttributes textAttributes = (TextAttributes) shadowNodeWrapper.getDeclaredShadowNodeField(TEXT_ATTRIBUTES_FIELD_NAME);
    if (textAttributes != null) {
      return (long) textAttributes.getEffectiveFontSize();
    }

    return null;
  }

  private String getFontFamily(ShadowNodeWrapper shadowNodeWrapper) {
    String fontFamily = (String) shadowNodeWrapper.getDeclaredShadowNodeField(FONT_FAMILY_FIELD_NAME);

    if (fontFamily != null) {
      return resolveFontFamily(fontFamily.toLowerCase(Locale.US));
    }

    return null;
  }

  private String resolveFontFamily(String typefaceName) {
    switch (typefaceName) {
      case ROBOTO_TYPEFACE_NAME:
        return SANS_SERIF_FAMILY_NAME;
      case MONOSPACE_FAMILY_NAME:
        return MONOSPACE_FAMILY_NAME;
      case SERIF_FAMILY_NAME:
        return SERIF_FAMILY_NAME;
      default:
        return SANS_SERIF_FAMILY_NAME;
    }
  }

  private static class TextStyleAndPosition {
    final TextStyle textStyle;
    final TextPosition textPosition;

    TextStyleAndPosition(TextStyle textStyle, TextPosition textPosition) {
      this.textStyle = textStyle;
      this.textPosition = textPosition;
    }
  }

  private static class ShapeAndBorder {
    final ShapeStyle shapeStyle;
    final ShapeBorder border;

    ShapeAndBorder(ShapeStyle shapeStyle, ShapeBorder border) {
      this.shapeStyle = shapeStyle;
      this.border = border;
    }
  }
}
