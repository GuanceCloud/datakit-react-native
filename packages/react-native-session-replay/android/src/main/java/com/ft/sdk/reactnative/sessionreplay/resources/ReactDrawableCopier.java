/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.resources;

import android.content.res.Resources;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;

import com.ft.sdk.reactnative.extensions.ReactDrawablesExt;
import com.ft.sdk.sessionreplay.resources.DefaultDrawableCopier;
import com.ft.sdk.sessionreplay.resources.DrawableCopier;

public class ReactDrawableCopier implements DrawableCopier {
  private final DefaultDrawableCopier defaultCopier = new DefaultDrawableCopier();

  @Override
  public Drawable copy(Drawable originalDrawable, Resources resources) {
    if (originalDrawable.getConstantState() != null) {
      return defaultCopier.copy(originalDrawable, resources);
    } else {
      android.graphics.Bitmap bitmap = ReactDrawablesExt.tryToExtractBitmap(originalDrawable, resources);
      if (bitmap != null) {
        BitmapDrawable bitmapDrawable = new BitmapDrawable(resources, bitmap);
        bitmapDrawable.setBounds(originalDrawable.getBounds());
        bitmapDrawable.setAlpha(originalDrawable.getAlpha());
        return bitmapDrawable;
      }
      return null;
    }
  }
}
