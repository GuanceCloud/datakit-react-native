/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.utils;

import java.lang.reflect.Field;

public class ReflectionUtils {
    public Object getDeclaredField(Object instance, String fieldName) {
        if (instance == null) {
            return null;
        }
        Class<?> classInstance = instance.getClass();
        Field declaredField = searchForField(classInstance, fieldName);

        if (declaredField != null) {
            declaredField.setAccessible(true);
            try {
                return declaredField.get(instance);
            } catch (IllegalAccessException e) {
                return null;
            }
        }
        return null;
    }

    private Field searchForField(Class<?> className, String fieldName) {
        for (Field field : className.getDeclaredFields()) {
            if (field.getName().equals(fieldName)) {
                return field;
            }
        }

        if (className.getSuperclass() != null) {
            return searchForField(className.getSuperclass(), fieldName);
        } else {
            return null;
        }
    }
}
