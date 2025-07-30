package com.ft.sdk.reactnative.sessionreplay.utils.text;

import android.view.Gravity;
import android.widget.TextView;

import com.ft.sdk.reactnative.BuildConfig;
import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReflectionUtils;
import com.facebook.react.bridge.ReactContext;
import com.ft.sdk.sessionreplay.model.Alignment;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;
import com.ft.sdk.sessionreplay.model.TextPosition;
import com.ft.sdk.sessionreplay.model.TextStyle;
import com.ft.sdk.sessionreplay.model.TextWireframe;
import com.ft.sdk.sessionreplay.model.Vertical;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.ArrayList;
import java.util.List;

public abstract class TextViewUtils {
  protected final ReactContext reactContext;
  protected final DrawableUtils drawableUtils;

  public TextViewUtils(ReactContext reactContext, DrawableUtils drawableUtils) {
    this.reactContext = reactContext;
    this.drawableUtils = drawableUtils;
  }

  public List<Wireframe> mapTextViewToWireframes(
    List<Wireframe> wireframes,
    TextView view,
    MappingContext mappingContext
  ) {
    List<Wireframe> result = new ArrayList<>();
    float pixelDensity = mappingContext.getSystemInformation().getScreenDensity();
    for (Wireframe originalWireframe : wireframes) {
      if (!(originalWireframe instanceof TextWireframe)) {
        result.add(originalWireframe);
      } else {
        result.add(addReactNativeProperties(
          (TextWireframe) originalWireframe,
          view,
          pixelDensity
        ));
      }
    }
    return result;
  }

  public TextWireframe addReactNativeProperties(
    TextWireframe originalWireframe,
    TextView view,
    float pixelDensity
  ) {
    Pair<ShapeStyle, ShapeBorder> shapeAndBorder = resolveShapeStyleAndBorder(view, pixelDensity);
    ShapeStyle shapeStyle = shapeAndBorder != null ? shapeAndBorder.first : originalWireframe.getShapeStyle();
    ShapeBorder border = shapeAndBorder != null ? shapeAndBorder.second : originalWireframe.getBorder();

    Pair<TextStyle, TextPosition> textStyleAndPosition = resolveTextStyleAndPosition(originalWireframe, view, pixelDensity);
    TextStyle textStyle = textStyleAndPosition != null ? textStyleAndPosition.first : originalWireframe.getTextStyle();
    TextPosition textPosition = textStyleAndPosition != null ? textStyleAndPosition.second : originalWireframe.getTextPosition();

    // nothing changed, return the original wireframe
    if (shapeStyle == originalWireframe.getShapeStyle()
      && border == originalWireframe.getBorder()
      && textStyle == originalWireframe.getTextStyle()
      && textPosition == originalWireframe.getTextPosition()) {
      return originalWireframe;
    }

    return new TextWireframe(
      originalWireframe.getId(),
      originalWireframe.getX(),
      originalWireframe.getY(),
      originalWireframe.getWidth(),
      originalWireframe.getHeight(),
      originalWireframe.getClip(),
      shapeStyle,
      border,
      originalWireframe.getText(),
      textStyle,
      textPosition
    );
  }

  protected Pair<TextStyle, TextPosition> resolveTextStyleAndPosition(
    TextWireframe originalWireframe,
    TextView view,
    float pixelDensity
  ) {
    if (!reactContext.hasActiveReactInstance()) {
      return null;
    }
    TextStyle textStyle = resolveTextStyle(originalWireframe, pixelDensity, view);
    if (textStyle == null) return null;
    Alignment alignment = resolveTextAlignment(view, originalWireframe);
    TextPosition textPosition = new TextPosition(
      originalWireframe.getTextPosition() != null ? originalWireframe.getTextPosition().getPadding()
        : null, alignment
    );
    return new Pair<>(textStyle, textPosition);
  }

  protected Pair<ShapeStyle, ShapeBorder> resolveShapeStyleAndBorder(
    TextView view,
    float pixelDensity
  ) {
    android.graphics.drawable.Drawable backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.getBackground());
    if (backgroundDrawable == null) return null;
    float opacity = view.getAlpha();
    return drawableUtils.resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity);
  }

  protected Alignment resolveTextAlignment(
    TextView view,
    TextWireframe textWireframe
  ) {
    int gravity = view.getGravity();
    com.ft.sdk.sessionreplay.model.Horizontal horizontal = textWireframe.getTextPosition() != null && textWireframe.getTextPosition().getAlignment() != null ? textWireframe.getTextPosition().getAlignment().getHorizontal() : null;
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

  protected String resolveFontFamily(String typefaceName) {
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

  protected abstract TextStyle resolveTextStyle(
    TextWireframe textWireframe,
    float pixelsDensity,
    TextView view
  );

  public static final String TEXT_ATTRIBUTES_FIELD_NAME = "mTextAttributes";
  public static final String FONT_FAMILY_FIELD_NAME = "mFontFamily";
  public static final String COLOR_FIELD_NAME = "mColor";
  public static final String IS_COLOR_SET_FIELD_NAME = "mIsColorSet";
  public static final String SPANNED_FIELD_NAME = "mSpanned";
  private static final String ROBOTO_TYPEFACE_NAME = "roboto";
  private static final String SERIF_FAMILY_NAME = "serif";
  private static final String SANS_SERIF_FAMILY_NAME = "roboto, sans-serif";
  public static final String MONOSPACE_FAMILY_NAME = "monospace";
  public static final String RESOLVE_UIMANAGERMODULE_ERROR = "Unable to resolve UIManagerModule";
  public static final String RESOLVE_FABRICFIELD_ERROR = "Unable to resolve field from fabric view";
  public static final String NULL_FABRICFIELD_ERROR = "Null value found when trying to resolve field from fabric view";

  public static TextViewUtils create(ReactContext reactContext, InternalLogger logger) {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      return new FabricTextViewUtils(reactContext, logger, new ReactViewBackgroundDrawableUtils());
    } else {
    return new LegacyTextViewUtils(reactContext, logger, new ReflectionUtils(), new ReactViewBackgroundDrawableUtils());
    }
  }

}
