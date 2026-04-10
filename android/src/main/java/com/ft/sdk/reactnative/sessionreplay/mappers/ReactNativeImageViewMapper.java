/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.widget.ImageView;

import com.ft.sdk.reactnative.extensions.ReactDrawablesExt;
import com.ft.sdk.reactnative.sessionreplay.resources.ReactDrawableCopier;
import com.facebook.drawee.drawable.FadeDrawable;
import com.facebook.react.views.image.ReactImageView;
import com.facebook.react.views.imagehelper.ImageSource;
import com.ft.sdk.sessionreplay.internal.utils.ImageViewUtils;
import com.ft.sdk.sessionreplay.internal.utils.RectExt;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.model.WireframeClip;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.BaseAsyncBackgroundWireframeMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

public class ReactNativeImageViewMapper extends BaseAsyncBackgroundWireframeMapper<ReactImageView> {
  private static final String IMAGE_SOURCE_GETTER_NAME = "getImageSource";
  private static final String[] IMAGE_SOURCE_FIELD_NAMES = {"imageSource", "mImageSource"};
  private static final ConcurrentHashMap<Class<?>, SourceAccessor> SOURCE_ACCESSORS = new ConcurrentHashMap<>();

  private final ReactDrawableCopier drawableCopier = new ReactDrawableCopier();
  private final ImageViewUtils imageViewUtils = ImageViewUtils.get();

  public ReactNativeImageViewMapper() {
    super(
      DefaultViewIdentifierResolver.get(),
      DefaultColorStringFormatter.get(),
      DefaultViewBoundsResolver.get(),
      DrawableToColorMapperFactory.getDefault()
    );
  }

  @Override
  public List<Wireframe> map(
    ReactImageView view,
    MappingContext mappingContext,
    AsyncJobStatusCallback asyncJobStatusCallback,
    InternalLogger internalLogger
  ) {
    List<Wireframe> wireframes = new ArrayList<>(super.map(view, mappingContext, asyncJobStatusCallback, internalLogger));

    Drawable drawable = view.getDrawable() != null ? view.getDrawable().getCurrent() : null;
    if (drawable == null) {
      return wireframes;
    }
    Rect parentRect = imageViewUtils.resolveParentRectAbsPosition(view);
    ImageView.ScaleType scaleType = (drawable instanceof FadeDrawable)
      ? ReactDrawablesExt.imageViewScaleType(ReactDrawablesExt.getScaleTypeDrawable((FadeDrawable) drawable))
      : view.getScaleType();
    Rect contentRect = imageViewUtils.resolveContentRectWithScaling(view, drawable, scaleType);

    android.content.res.Resources resources = view.getResources();
    float density = resources.getDisplayMetrics().density;

    WireframeClip clipping = view.getCropToPadding()
      ? RectExt.toWireframeClip(imageViewUtils.calculateClipping(parentRect, contentRect, density))
      : null;

    long contentXPosInDp = (long) (contentRect.left / density);
    long contentYPosInDp = (long) (contentRect.top / density);
    int contentWidthPx = contentRect.width();
    int contentHeightPx = contentRect.height();

    // resolve foreground
    Wireframe imageWireframe = mappingContext.getImageWireframeHelper().createImageWireframeByDrawable(
      view,
      mappingContext.getImagePrivacy(),
      wireframes.size(),
      contentXPosInDp,
      contentYPosInDp,
      contentWidthPx,
      contentHeightPx,
      true,
      drawable,
      drawableCopier,
      asyncJobStatusCallback,
      clipping,
      null,
      null,
      "drawable",
      generateUUID(view)
    );
    if (imageWireframe != null) {
      wireframes.add(imageWireframe);
    }

    return wireframes;
  }

  private String generateUUID(ReactImageView reactImageView) {
    Drawable currentDrawable = reactImageView.getDrawable();
    String drawableType = currentDrawable != null ? currentDrawable.getClass().getName() : "null";
    String resourceCacheKey = resolveImageSourceSignature(reactImageView);
    if (resourceCacheKey == null) {
      resourceCacheKey = String.valueOf(System.identityHashCode(reactImageView));
    }
    return drawableType + "-" + resourceCacheKey;
  }

  private String resolveImageSourceSignature(ReactImageView reactImageView) {
    try {
      SourceAccessor sourceAccessor = getSourceAccessor(reactImageView.getClass());
      return extractImageSourceSignature(readActiveImageSource(reactImageView, sourceAccessor));
    } catch (Throwable ignored) {
      return null;
    }
  }

  private String extractImageSourceSignature(Object imageSourceObject) {
    if (!(imageSourceObject instanceof ImageSource imageSource)) {
      return null;
    }

    try {
      String source = imageSource.getSource();
      if (source != null && !source.isEmpty()) {
        return source;
      }

      return imageSource.getUri().toString();
    } catch (Throwable ignored) {
      return null;
    }
  }

  private Object readActiveImageSource(ReactImageView reactImageView, SourceAccessor sourceAccessor) {
    if (sourceAccessor.imageSourceGetter != null) {
      try {
        return sourceAccessor.imageSourceGetter.invoke(reactImageView);
      } catch (Exception ignored) {
      }
    }

    if (sourceAccessor.imageSourceField != null) {
      try {
        return sourceAccessor.imageSourceField.get(reactImageView);
      } catch (Exception ignored) {
      }
    }

    return null;
  }

  private static SourceAccessor getSourceAccessor(Class<?> imageViewClass) {
    SourceAccessor sourceAccessor = SOURCE_ACCESSORS.get(imageViewClass);
    if (sourceAccessor != null) {
      return sourceAccessor;
    }

    SourceAccessor newAccessor = new SourceAccessor(
      findMethod(imageViewClass),
      findField(imageViewClass)
    );
    SourceAccessor existingAccessor = SOURCE_ACCESSORS.putIfAbsent(imageViewClass, newAccessor);
    return existingAccessor != null ? existingAccessor : newAccessor;
  }

  private static Method findMethod(Class<?> clazz) {
    Class<?> currentClass = clazz;
    while (currentClass != null) {
      try {
        Method method = currentClass.getDeclaredMethod(ReactNativeImageViewMapper.IMAGE_SOURCE_GETTER_NAME);
        method.setAccessible(true);
        return method;
      } catch (NoSuchMethodException ignored) {
        currentClass = currentClass.getSuperclass();
      } catch (Throwable ignored) {
        return null;
      }
    }
    return null;
  }

  private static Field findField(Class<?> clazz) {
    for (String fieldName : ReactNativeImageViewMapper.IMAGE_SOURCE_FIELD_NAMES) {
      Class<?> currentClass = clazz;
      while (currentClass != null) {
        try {
          Field field = currentClass.getDeclaredField(fieldName);
          field.setAccessible(true);
          return field;
        } catch (NoSuchFieldException ignored) {
          currentClass = currentClass.getSuperclass();
        } catch (Throwable ignored) {
          return null;
        }
      }
    }
    return null;
  }

  private static class SourceAccessor {
    private final Method imageSourceGetter;
    private final Field imageSourceField;

    private SourceAccessor(Method imageSourceGetter, Field imageSourceField) {
      this.imageSourceGetter = imageSourceGetter;
      this.imageSourceField = imageSourceField;
    }
  }
}
