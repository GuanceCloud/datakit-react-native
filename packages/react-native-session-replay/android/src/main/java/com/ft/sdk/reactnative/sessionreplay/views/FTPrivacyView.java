/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */
package com.ft.sdk.reactnative.sessionreplay.views;

import android.content.Context;
import com.facebook.react.views.view.ReactViewGroup;
import com.ft.sdk.sessionreplay.ImagePrivacy;
import com.ft.sdk.sessionreplay.PrivacyOverrideExtensions;
import com.ft.sdk.sessionreplay.TextAndInputPrivacy;
import com.ft.sdk.sessionreplay.TouchPrivacy;

public class FTPrivacyView extends ReactViewGroup {
    private TextAndInputPrivacy textAndInputPrivacy;
    private ImagePrivacy imagePrivacy;
    private TouchPrivacy touchPrivacy;
    private boolean hide;
    private String nativeID;

    public FTPrivacyView(Context context) {
        super(context);
    }

    public void setTextAndInputPrivacy(String value) {
        if (value == null || value.isEmpty()) {
            return;
        }
        switch (value) {
            case "MASK_SENSITIVE_INPUTS":
                this.textAndInputPrivacy = TextAndInputPrivacy.MASK_SENSITIVE_INPUTS;
                break;
            case "MASK_ALL_INPUTS":
                this.textAndInputPrivacy = TextAndInputPrivacy.MASK_ALL_INPUTS;
                break;
            case "MASK_ALL":
                this.textAndInputPrivacy = TextAndInputPrivacy.MASK_ALL;
                break;
            default:
                return;
        }
        PrivacyOverrideExtensions.setSessionReplayTextAndInputPrivacy(this, this.textAndInputPrivacy);
    }

    public void setImagePrivacy(String value) {
        if (value == null || value.isEmpty()) {
            return;
        }
        switch (value) {
            case "MASK_NON_BUNDLED_ONLY":
                this.imagePrivacy = ImagePrivacy.MASK_LARGE_ONLY;
                break;
            case "MASK_ALL":
                this.imagePrivacy = ImagePrivacy.MASK_ALL;
                break;
            case "MASK_NONE":
                this.imagePrivacy = ImagePrivacy.MASK_NONE;
                break;
            default:
                return;
        }
        PrivacyOverrideExtensions.setSessionReplayImagePrivacy(this, this.imagePrivacy);
    }

    public void setTouchPrivacy(String value) {
        if (value == null || value.isEmpty()) {
            return;
        }
        switch (value) {
            case "SHOW":
                this.touchPrivacy = TouchPrivacy.SHOW;
                break;
            case "HIDE":
                this.touchPrivacy = TouchPrivacy.HIDE;
                break;
            default:
                return;
        }
        PrivacyOverrideExtensions.setSessionReplayTouchPrivacy(this, this.touchPrivacy);
    }

    public void setHide(boolean value) {
        this.hide = value;
        PrivacyOverrideExtensions.setSessionReplayHidden(this, this.hide);
    }

    public void setNativeID(String nativeID) {
        this.nativeID = nativeID;
    }

    public TextAndInputPrivacy getTextAndInputPrivacy() {
        return textAndInputPrivacy;
    }

    public ImagePrivacy getImagePrivacy() {
        return imagePrivacy;
    }

    public TouchPrivacy getTouchPrivacy() {
        return touchPrivacy;
    }

    public boolean getHide() {
        return hide;
    }

    public String getNativeID() {
        return nativeID;
    }
}
