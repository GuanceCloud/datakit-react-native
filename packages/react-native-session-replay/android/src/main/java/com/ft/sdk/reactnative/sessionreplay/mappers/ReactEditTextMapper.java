/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import android.graphics.drawable.Drawable;
import android.view.View;

import com.ft.sdk.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.facebook.react.views.textinput.ReactEditText;
import com.ft.sdk.sessionreplay.model.ImageWireframe;
import com.ft.sdk.sessionreplay.model.PlaceholderWireframe;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;
import com.ft.sdk.sessionreplay.model.ShapeWireframe;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.BaseAsyncBackgroundWireframeMapper;
import com.ft.sdk.sessionreplay.recorder.mapper.EditTextMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.GlobalBounds;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.ArrayList;
import java.util.List;

public class ReactEditTextMapper extends BaseAsyncBackgroundWireframeMapper<ReactEditText> {
  private final TextViewUtils textViewUtils;
  private final ReactViewBackgroundDrawableUtils drawableUtils = new ReactViewBackgroundDrawableUtils();
  private final EditTextMapper editTextMapper;

  public ReactEditTextMapper(TextViewUtils textViewUtils) {
    super(
      DefaultViewIdentifierResolver.get(),
      DefaultColorStringFormatter.get(),
      DefaultViewBoundsResolver.get(),
      DrawableToColorMapperFactory.getDefault()
    );
    this.textViewUtils = textViewUtils;
    this.editTextMapper = new EditTextMapper(
      viewIdentifierResolver,
      colorStringFormatter,
      viewBoundsResolver,
      drawableToColorMapper
    );
  }

  @Override
  public List<Wireframe> map(
    ReactEditText view,
    MappingContext mappingContext,
    AsyncJobStatusCallback asyncJobStatusCallback,
    InternalLogger internalLogger
  ) {
    List<Wireframe> backgroundWireframes = new ArrayList<>(super.map(view, mappingContext, asyncJobStatusCallback, internalLogger));
    List<Wireframe> editTextWireframes = editTextMapper.map(
      view,
      mappingContext,
      asyncJobStatusCallback,
      internalLogger
    );

    List<Wireframe> filteredEditTextWireframes = new ArrayList<>();
    for (Wireframe wf : editTextWireframes) {
      if (!(wf instanceof ImageWireframe) && !(wf instanceof PlaceholderWireframe)) {
        filteredEditTextWireframes.add(wf);
      }
    }
    backgroundWireframes.addAll(filteredEditTextWireframes);
    return textViewUtils.mapTextViewToWireframes(
      backgroundWireframes,
      view,
      mappingContext
    );
  }

  @Override
  public Wireframe resolveBackgroundAsImageWireframe(
    View view,
    GlobalBounds bounds,
    int width,
    int height,
    MappingContext mappingContext,
    AsyncJobStatusCallback asyncJobStatusCallback
  ) {
    if (!(view instanceof ReactEditText)) {
      return super.resolveBackgroundAsImageWireframe(
        view,
        bounds,
        width,
        height,
        mappingContext,
        asyncJobStatusCallback
      );
    }
    Drawable backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(((ReactEditText) view).getBackground());
    if (backgroundDrawable == null) {
      return null;
    }
    float density = mappingContext.getSystemInformation().getScreenDensity();
    Long identifier = viewIdentifierResolver.resolveChildUniqueIdentifier(
      view,
      "drawable0"
    );
    if (identifier == null) {
      return null;
    }
    GlobalBounds globalBounds = viewBoundsResolver.resolveViewGlobalBounds(
      view,
      density
    );
    Pair<ShapeStyle, ShapeBorder> shapeAndBorder = drawableUtils.resolveShapeAndBorder(
      backgroundDrawable,
      ((ReactEditText) view).getAlpha(),
      mappingContext.getSystemInformation().getScreenDensity()
    );
    return new ShapeWireframe(
      identifier,
      globalBounds.getX(),
      globalBounds.getY(),
      globalBounds.getWidth(),
      globalBounds.getHeight(),
      null,
      shapeAndBorder.first,
      shapeAndBorder.second
    );
  }
}
