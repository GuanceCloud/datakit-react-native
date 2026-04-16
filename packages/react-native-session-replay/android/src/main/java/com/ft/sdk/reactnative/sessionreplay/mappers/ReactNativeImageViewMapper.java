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

public class ReactNativeImageViewMapper extends BaseAsyncBackgroundWireframeMapper<ReactImageView> {
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
    int hashCode = System.identityHashCode(reactImageView);
    String drawableType = reactImageView.getDrawable() != null ? reactImageView.getDrawable().getCurrent().getClass().getName() : "null";
    return drawableType + "-" + hashCode;
  }

  private WireframeClip toWireframeClip(Rect rect) {
    return new WireframeClip(
      (long) rect.top,
      (long) rect.bottom,
      (long) rect.left,
      (long) rect.right
    );
  }
}
