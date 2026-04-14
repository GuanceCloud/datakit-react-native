/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.extensions;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Bitmap.Config;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.ShapeDrawable;
import android.graphics.drawable.VectorDrawable;
import android.widget.ImageView;
import androidx.appcompat.graphics.drawable.DrawerArrowDrawable;
import com.facebook.drawee.drawable.ArrayDrawable;
import com.facebook.drawee.drawable.ForwardingDrawable;
import com.facebook.drawee.drawable.RoundedBitmapDrawable;
import com.facebook.drawee.drawable.ScaleTypeDrawable;
import com.facebook.drawee.drawable.ScalingUtils;

public class ReactDrawablesExt {
    public static ImageView.ScaleType imageViewScaleType(ScaleTypeDrawable scaleTypeDrawable) {
        ScalingUtils.ScaleType scaleType = scaleTypeDrawable.getScaleType();
        if (scaleType == ScalingUtils.ScaleType.CENTER) return ImageView.ScaleType.CENTER;
        if (scaleType == ScalingUtils.ScaleType.CENTER_CROP) return ImageView.ScaleType.CENTER_CROP;
        if (scaleType == ScalingUtils.ScaleType.CENTER_INSIDE) return ImageView.ScaleType.CENTER_INSIDE;
        if (scaleType == ScalingUtils.ScaleType.FIT_CENTER) return ImageView.ScaleType.FIT_CENTER;
        if (scaleType == ScalingUtils.ScaleType.FIT_START) return ImageView.ScaleType.FIT_START;
        if (scaleType == ScalingUtils.ScaleType.FIT_END) return ImageView.ScaleType.FIT_END;
        if (scaleType == ScalingUtils.ScaleType.FIT_XY) return ImageView.ScaleType.FIT_XY;
        return null;
    }

    public static ScaleTypeDrawable getScaleTypeDrawable(ArrayDrawable arrayDrawable) {
        for (int i = 0; i < arrayDrawable.getNumberOfLayers(); i++) {
            Drawable drawable = getDrawableOrNull(arrayDrawable, i);
            if (drawable instanceof ScaleTypeDrawable) return (ScaleTypeDrawable) drawable;
        }
        return null;
    }

    public static Drawable getDrawableOrNull(ArrayDrawable arrayDrawable, int index) {
        try {
            return arrayDrawable.getDrawable(index);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public static Bitmap tryToExtractBitmap(ForwardingDrawable forwardingDrawable, Resources resources) {
        Drawable forwardedDrawable = forwardingDrawable.getDrawable();
        if (forwardedDrawable != null) {
            return tryToExtractBitmap(forwardedDrawable, resources);
        } else {
            return toBitmapOrNull(forwardingDrawable, forwardingDrawable.getIntrinsicWidth(), forwardingDrawable.getIntrinsicHeight(), Config.ARGB_8888);
        }
    }

    public static Bitmap tryToExtractBitmap(RoundedBitmapDrawable roundedBitmapDrawable) {
        try {
            java.lang.reflect.Field field = RoundedBitmapDrawable.class.getDeclaredField("mBitmap");
            field.setAccessible(true);
            Object value = field.get(roundedBitmapDrawable);
            if (value instanceof Bitmap) {
                return (Bitmap) value;
            }
        } catch (NoSuchFieldException | IllegalAccessException e) {
            // ignore
        } catch (Exception e) {
            // ignore
        }
        return toBitmapOrNull(roundedBitmapDrawable, roundedBitmapDrawable.getIntrinsicWidth(), roundedBitmapDrawable.getIntrinsicHeight(), Config.ARGB_8888);
    }

    public static Bitmap tryToExtractBitmap(BitmapDrawable bitmapDrawable, Resources resources) {
        if (bitmapDrawable.getBitmap() != null) {
            return bitmapDrawable.getBitmap();
        }
        if (bitmapDrawable.getConstantState() != null) {
            Drawable copy = bitmapDrawable.getConstantState().newDrawable(resources);
            if (copy instanceof BitmapDrawable) {
                Bitmap b = ((BitmapDrawable) copy).getBitmap();
                if (b != null) return b;
            }
            return toBitmapOrNull(copy, copy.getIntrinsicWidth(), copy.getIntrinsicHeight(), Config.ARGB_8888);
        }
        return null;
    }

    public static Bitmap tryToExtractBitmap(ArrayDrawable arrayDrawable, Resources resources) {
        int width = 0, height = 0;
        for (int i = 0; i < arrayDrawable.getNumberOfLayers(); i++) {
            Drawable drawable = getDrawableOrNull(arrayDrawable, i);
            if (drawable instanceof ScaleTypeDrawable) {
                return tryToExtractBitmap((ScaleTypeDrawable) drawable, resources);
            }
            if (drawable != null && drawable.getIntrinsicWidth() * drawable.getIntrinsicHeight() > width * height) {
                width = drawable.getIntrinsicWidth();
                height = drawable.getIntrinsicHeight();
            }
        }
        if (width > 0 && height > 0) {
            return toBitmapOrNull(arrayDrawable, width, height, Config.ARGB_8888);
        } else {
            return null;
        }
    }

    public static Bitmap tryToExtractBitmap(Drawable drawable, Resources resources) {
        if (drawable instanceof ArrayDrawable) {
            return tryToExtractBitmap((ArrayDrawable) drawable, resources);
        } else if (drawable instanceof ForwardingDrawable) {
            return tryToExtractBitmap((ForwardingDrawable) drawable, resources);
        } else if (drawable instanceof RoundedBitmapDrawable) {
            return tryToExtractBitmap((RoundedBitmapDrawable) drawable);
        } else if (drawable instanceof BitmapDrawable) {
            return tryToExtractBitmap((BitmapDrawable) drawable, resources);
        } else if (drawable instanceof VectorDrawable || drawable instanceof ShapeDrawable || drawable instanceof DrawerArrowDrawable) {
            return toBitmapOrNull(drawable, drawable.getIntrinsicWidth(), drawable.getIntrinsicHeight(), Config.ARGB_8888);
        } else {
            return null;
        }
    }

    public static Bitmap toBitmapOrNull(Drawable drawable, int width, int height, Config config) {
        if (drawable instanceof BitmapDrawable && ((BitmapDrawable) drawable).getBitmap() == null) {
            return null;
        }
        return toBitmap(drawable, width, height, config);
    }

    public static Bitmap toBitmap(Drawable drawable, int width, int height, Config config) {
        if (drawable instanceof BitmapDrawable) {
            Bitmap bitmap = ((BitmapDrawable) drawable).getBitmap();
            if (bitmap == null) {
                return Bitmap.createBitmap(width, height, config != null ? config : Config.ARGB_8888);
            }
            if (config == null || bitmap.getConfig() == config) {
                if (width == bitmap.getWidth() && height == bitmap.getHeight()) {
                    return bitmap;
                }
                return Bitmap.createScaledBitmap(bitmap, width, height, true);
            }
        }
        Bitmap bitmap = Bitmap.createBitmap(width, height, config != null ? config : Config.ARGB_8888);
        drawable.setBounds(0, 0, width, height);
        drawable.draw(new Canvas(bitmap));
        // restore bounds if needed
        return bitmap;
    }
}
