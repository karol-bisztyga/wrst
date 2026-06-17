#include <stdlib.h>
#include <string.h>
#include "quickjs.h"
#include "qjs_bridge.h"

// Implemented in Swift via @_cdecl. Called synchronously during eval (main thread).
extern void swift_native_log(const char *msg);
extern void swift_native_warn(const char *msg);
extern void swift_native_error(const char *msg);
extern void swift_native_register_state(const char *id, const char *value_json);
extern void swift_native_set_state(const char *id, const char *value_json);
extern char *swift_native_get_state(const char *id); // malloc'd or NULL; we free
extern char *swift_native_set_app_config(const char *color); // NULL ok, else malloc'd error
extern double swift_native_performance_now(void);
extern char *swift_native_device_info(void); // malloc'd JSON; we free
extern void swift_native_set_show_header(int show);
extern void swift_native_set_timeout(const char *id, double delay);
extern void swift_native_clear_timeout(const char *id);
extern void swift_native_set_interval(const char *id, double delay);
extern void swift_native_clear_interval(const char *id);
extern void swift_native_navigate(void);
extern void swift_native_go_back(void);
extern char *swift_native_storage_get(const char *key); // malloc'd or NULL; we free
extern void swift_native_storage_set(const char *key, const char *value);
extern void swift_native_storage_remove(const char *key);
extern void swift_native_storage_clear(void);
extern void swift_native_fetch(const char *url, const char *options, const char *resolve_id, const char *reject_id);
extern char *swift_native_module_call(const char *name, const char *args_json); // malloc'd JSON or NULL; we free
extern void swift_native_sensor_start(const char *type, const char *callback_id, double interval_ms);
extern void swift_native_sensor_stop(const char *callback_id);
extern char *swift_native_permission_status(const char *name); // malloc'd status string; we free
extern void swift_native_permission_request(const char *name, const char *resolve_id);
extern char *swift_native_companion_status(void); // malloc'd JSON snapshot or NULL; we free
extern void swift_native_companion_send(const char *json);

struct QJSBridge {
    JSRuntime *rt;
    JSContext *ctx;
};

// JSON-serialize a JS value to a malloc'd C string (caller frees), or NULL.
static char *value_to_json(JSContext *ctx, JSValueConst v) {
    JSValue j = JS_JSONStringify(ctx, v, JS_UNDEFINED, JS_UNDEFINED);
    char *out = NULL;
    if (!JS_IsException(j) && JS_IsString(j)) {
        const char *s = JS_ToCString(ctx, j);
        if (s) { out = strdup(s); JS_FreeCString(ctx, s); }
    }
    JS_FreeValue(ctx, j);
    return out;
}

// --- native.* implementations ---

static JSValue n_log(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *s = JS_ToCString(ctx, argv[0]);
        if (s) { swift_native_log(s); JS_FreeCString(ctx, s); }
    }
    return JS_UNDEFINED;
}

static JSValue n_warn(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *s = JS_ToCString(ctx, argv[0]);
        if (s) { swift_native_warn(s); JS_FreeCString(ctx, s); }
    }
    return JS_UNDEFINED;
}

static JSValue n_error(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *s = JS_ToCString(ctx, argv[0]);
        if (s) { swift_native_error(s); JS_FreeCString(ctx, s); }
    }
    return JS_UNDEFINED;
}

static JSValue n_register_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 2) {
        const char *id = JS_ToCString(ctx, argv[0]);
        char *json = value_to_json(ctx, argv[1]);
        if (id) swift_native_register_state(id, json ? json : "null");
        if (id) JS_FreeCString(ctx, id);
        free(json);
    }
    return JS_UNDEFINED;
}

static JSValue n_set_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 2) {
        const char *id = JS_ToCString(ctx, argv[0]);
        char *json = value_to_json(ctx, argv[1]);
        if (id) swift_native_set_state(id, json ? json : "null");
        if (id) JS_FreeCString(ctx, id);
        free(json);
    }
    return JS_UNDEFINED;
}

static JSValue n_get_state(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_UNDEFINED;
    const char *id = JS_ToCString(ctx, argv[0]);
    JSValue result = JS_UNDEFINED;
    if (id) {
        char *json = swift_native_get_state(id);
        if (json) {
            JSValue parsed = JS_ParseJSON(ctx, json, strlen(json), "<getState>");
            if (JS_IsException(parsed)) JS_FreeValue(ctx, parsed);
            else result = parsed;
            free(json);
        }
        JS_FreeCString(ctx, id);
    }
    return result;
}

static JSValue n_performance_now(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    return JS_NewFloat64(ctx, swift_native_performance_now());
}

static JSValue n_device_info(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *json = swift_native_device_info();
    if (!json) return JS_NULL;
    JSValue result = JS_NewString(ctx, json);
    free(json);
    return result;
}

static JSValue n_set_show_header(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    int show = 0;
    if (argc >= 1) show = JS_ToBool(ctx, argv[0]);
    swift_native_set_show_header(show);
    return JS_UNDEFINED;
}

static JSValue n_set_app_config(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *s = JS_ToCString(ctx, argv[0]);
        if (s) {
            char *err = swift_native_set_app_config(s);
            JS_FreeCString(ctx, s);
            if (err) {
                JSValue ex = JS_ThrowTypeError(ctx, "%s", err); // propagates to eval → error screen
                free(err);
                return ex;
            }
        }
    }
    return JS_UNDEFINED;
}

// Phase 0 stubs (real impls in later phases).
static JSValue n_noop(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    return JS_UNDEFINED;
}
// --- localStorage ---

static JSValue n_storage_get(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_NULL;
    const char *key = JS_ToCString(ctx, argv[0]);
    if (!key) return JS_NULL;
    char *value = swift_native_storage_get(key);
    JS_FreeCString(ctx, key);
    if (!value) return JS_NULL;
    JSValue result = JS_NewString(ctx, value);
    free(value);
    return result;
}

static JSValue n_storage_set(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 2) {
        const char *key = JS_ToCString(ctx, argv[0]);
        const char *value = JS_ToCString(ctx, argv[1]);
        if (key && value) swift_native_storage_set(key, value);
        if (key) JS_FreeCString(ctx, key);
        if (value) JS_FreeCString(ctx, value);
    }
    return JS_UNDEFINED;
}

static JSValue n_storage_remove(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *key = JS_ToCString(ctx, argv[0]);
        if (key) { swift_native_storage_remove(key); JS_FreeCString(ctx, key); }
    }
    return JS_UNDEFINED;
}

static JSValue n_storage_clear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    swift_native_storage_clear();
    return JS_UNDEFINED;
}

// --- fetch ---
// Kicks off the request on the Swift side; the resolve/reject callbacks are
// invoked later via call(id, json).
static JSValue n_fetch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 4) {
        const char *url = JS_ToCString(ctx, argv[0]);
        const char *options = JS_ToCString(ctx, argv[1]);
        const char *resolve_id = JS_ToCString(ctx, argv[2]);
        const char *reject_id = JS_ToCString(ctx, argv[3]);
        if (url && resolve_id && reject_id)
            swift_native_fetch(url, options ? options : "{}", resolve_id, reject_id);
        if (url) JS_FreeCString(ctx, url);
        if (options) JS_FreeCString(ctx, options);
        if (resolve_id) JS_FreeCString(ctx, resolve_id);
        if (reject_id) JS_FreeCString(ctx, reject_id);
    }
    return JS_UNDEFINED;
}

// --- timers ---

static JSValue n_set_timeout(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *id = JS_ToCString(ctx, argv[0]);
        double delay = 0;
        if (argc >= 2) JS_ToFloat64(ctx, &delay, argv[1]);
        if (id) { swift_native_set_timeout(id, delay); JS_FreeCString(ctx, id); }
    }
    return JS_UNDEFINED;
}

static JSValue n_clear_timeout(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *id = JS_ToCString(ctx, argv[0]);
        if (id) { swift_native_clear_timeout(id); JS_FreeCString(ctx, id); }
    }
    return JS_UNDEFINED;
}

static JSValue n_set_interval(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *id = JS_ToCString(ctx, argv[0]);
        double delay = 0;
        if (argc >= 2) JS_ToFloat64(ctx, &delay, argv[1]);
        if (id) { swift_native_set_interval(id, delay); JS_FreeCString(ctx, id); }
    }
    return JS_UNDEFINED;
}

static JSValue n_clear_interval(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *id = JS_ToCString(ctx, argv[0]);
        if (id) { swift_native_clear_interval(id); JS_FreeCString(ctx, id); }
    }
    return JS_UNDEFINED;
}

static JSValue n_navigate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    swift_native_navigate();
    return JS_UNDEFINED;
}

static JSValue n_go_back(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    swift_native_go_back();
    return JS_UNDEFINED;
}

// Extension hook: native.nativeModuleCall(name, argsJson) -> jsonString | null.
// Forwards to the Swift module registry and returns the module's JSON-encoded
// result *as a string* (the JS side runs JSON.parse on it - mirrors Android).
static JSValue n_module_call(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_NULL;
    const char *name = JS_ToCString(ctx, argv[0]);
    const char *args = argc >= 2 ? JS_ToCString(ctx, argv[1]) : NULL;
    JSValue result = JS_NULL;
    if (name) {
        char *json = swift_native_module_call(name, args ? args : "[]");
        if (json) {
            result = JS_NewString(ctx, json);
            free(json);
        }
    }
    if (name) JS_FreeCString(ctx, name);
    if (args) JS_FreeCString(ctx, args);
    return result;
}

// Engine sensors: native.nativeSensorStart(type, callbackId, intervalMs) /
// nativeSensorStop(callbackId). Native samples are pushed back via call(id, json).
static JSValue n_sensor_start(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 2) {
        const char *type = JS_ToCString(ctx, argv[0]);
        const char *cb = JS_ToCString(ctx, argv[1]);
        double interval = 100;
        if (argc >= 3) JS_ToFloat64(ctx, &interval, argv[2]);
        if (type && cb) swift_native_sensor_start(type, cb, interval);
        if (type) JS_FreeCString(ctx, type);
        if (cb) JS_FreeCString(ctx, cb);
    }
    return JS_UNDEFINED;
}

static JSValue n_sensor_stop(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *cb = JS_ToCString(ctx, argv[0]);
        if (cb) { swift_native_sensor_stop(cb); JS_FreeCString(ctx, cb); }
    }
    return JS_UNDEFINED;
}

// Runtime permissions: nativePermissionStatus(name) -> status string (sync) /
// nativePermissionRequest(name, resolveId) -> void; native calls call(resolveId, status).
static JSValue n_permission_status(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_NULL;
    const char *name = JS_ToCString(ctx, argv[0]);
    JSValue result = JS_NULL;
    if (name) {
        char *s = swift_native_permission_status(name);
        if (s) { result = JS_NewString(ctx, s); free(s); }
        JS_FreeCString(ctx, name);
    }
    return result;
}

static JSValue n_permission_request(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 2) {
        const char *name = JS_ToCString(ctx, argv[0]);
        const char *rid = JS_ToCString(ctx, argv[1]);
        if (name && rid) swift_native_permission_request(name, rid);
        if (name) JS_FreeCString(ctx, name);
        if (rid) JS_FreeCString(ctx, rid);
    }
    return JS_UNDEFINED;
}

// Companion: nativeCompanionStatus() -> jsonString | null (sync snapshot read at
// startup) / nativeCompanionSend(json) -> void. Link-status changes + incoming
// messages are pushed back into JS via __wrstCompanionStatus / __wrstCompanionMessage.
static JSValue n_companion_status(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *json = swift_native_companion_status();
    JSValue result = JS_NULL;
    if (json) { result = JS_NewString(ctx, json); free(json); }
    return result;
}

static JSValue n_companion_send(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc >= 1) {
        const char *json = JS_ToCString(ctx, argv[0]);
        if (json) { swift_native_companion_send(json); JS_FreeCString(ctx, json); }
    }
    return JS_UNDEFINED;
}

static void install_native(JSContext *ctx) {
    JSValue global = JS_GetGlobalObject(ctx);
    JSValue native = JS_NewObject(ctx);

    JS_SetPropertyStr(ctx, native, "log", JS_NewCFunction(ctx, n_log, "log", 1));
    JS_SetPropertyStr(ctx, native, "warn", JS_NewCFunction(ctx, n_warn, "warn", 1));
    JS_SetPropertyStr(ctx, native, "error", JS_NewCFunction(ctx, n_error, "error", 1));
    JS_SetPropertyStr(ctx, native, "registerState", JS_NewCFunction(ctx, n_register_state, "registerState", 2));
    JS_SetPropertyStr(ctx, native, "setState", JS_NewCFunction(ctx, n_set_state, "setState", 2));
    JS_SetPropertyStr(ctx, native, "getState", JS_NewCFunction(ctx, n_get_state, "getState", 1));
    JS_SetPropertyStr(ctx, native, "performanceNow", JS_NewCFunction(ctx, n_performance_now, "performanceNow", 0));
    JS_SetPropertyStr(ctx, native, "nativeDeviceInfo", JS_NewCFunction(ctx, n_device_info, "nativeDeviceInfo", 0));
    JS_SetPropertyStr(ctx, native, "nativeSetShowHeader", JS_NewCFunction(ctx, n_set_show_header, "nativeSetShowHeader", 1));
    JS_SetPropertyStr(ctx, native, "nativeSetAppConfig", JS_NewCFunction(ctx, n_set_app_config, "nativeSetAppConfig", 1));

    JS_SetPropertyStr(ctx, native, "nativeSetTimeout", JS_NewCFunction(ctx, n_set_timeout, "nativeSetTimeout", 2));
    JS_SetPropertyStr(ctx, native, "nativeClearTimeout", JS_NewCFunction(ctx, n_clear_timeout, "nativeClearTimeout", 1));
    JS_SetPropertyStr(ctx, native, "nativeSetInterval", JS_NewCFunction(ctx, n_set_interval, "nativeSetInterval", 2));
    JS_SetPropertyStr(ctx, native, "nativeClearInterval", JS_NewCFunction(ctx, n_clear_interval, "nativeClearInterval", 1));
    JS_SetPropertyStr(ctx, native, "nativeNavigate", JS_NewCFunction(ctx, n_navigate, "nativeNavigate", 0));
    JS_SetPropertyStr(ctx, native, "nativeGoBack", JS_NewCFunction(ctx, n_go_back, "nativeGoBack", 0));
    JS_SetPropertyStr(ctx, native, "nativeModuleCall", JS_NewCFunction(ctx, n_module_call, "nativeModuleCall", 2));
    JS_SetPropertyStr(ctx, native, "nativeSensorStart", JS_NewCFunction(ctx, n_sensor_start, "nativeSensorStart", 3));
    JS_SetPropertyStr(ctx, native, "nativeSensorStop", JS_NewCFunction(ctx, n_sensor_stop, "nativeSensorStop", 1));
    JS_SetPropertyStr(ctx, native, "nativePermissionStatus", JS_NewCFunction(ctx, n_permission_status, "nativePermissionStatus", 1));
    JS_SetPropertyStr(ctx, native, "nativePermissionRequest", JS_NewCFunction(ctx, n_permission_request, "nativePermissionRequest", 2));
    JS_SetPropertyStr(ctx, native, "nativeCompanionStatus", JS_NewCFunction(ctx, n_companion_status, "nativeCompanionStatus", 0));
    JS_SetPropertyStr(ctx, native, "nativeCompanionSend", JS_NewCFunction(ctx, n_companion_send, "nativeCompanionSend", 1));

    JS_SetPropertyStr(ctx, native, "nativeStorageGet", JS_NewCFunction(ctx, n_storage_get, "nativeStorageGet", 1));
    JS_SetPropertyStr(ctx, native, "nativeStorageSet", JS_NewCFunction(ctx, n_storage_set, "nativeStorageSet", 2));
    JS_SetPropertyStr(ctx, native, "nativeStorageRemove", JS_NewCFunction(ctx, n_storage_remove, "nativeStorageRemove", 1));
    JS_SetPropertyStr(ctx, native, "nativeStorageClear", JS_NewCFunction(ctx, n_storage_clear, "nativeStorageClear", 0));
    JS_SetPropertyStr(ctx, native, "nativeFetch", JS_NewCFunction(ctx, n_fetch, "nativeFetch", 4));

    static const char *stubs[] = {
        "nativeRerender", NULL
    };
    for (int i = 0; stubs[i]; i++)
        JS_SetPropertyStr(ctx, native, stubs[i], JS_NewCFunction(ctx, n_noop, stubs[i], 0));

    JS_SetPropertyStr(ctx, global, "native", native); // steals `native`
    JS_FreeValue(ctx, global);
}

QJSBridge *qjs_bridge_create(void) {
    QJSBridge *b = (QJSBridge *)calloc(1, sizeof(QJSBridge));
    if (!b) return NULL;
    b->rt = JS_NewRuntime();
    b->ctx = JS_NewContext(b->rt);
    install_native(b->ctx);
    return b;
}

void qjs_bridge_destroy(QJSBridge *b) {
    if (!b) return;
    if (b->ctx) JS_FreeContext(b->ctx);
    if (b->rt) JS_FreeRuntime(b->rt);
    free(b);
}

static char *dup_exception(JSContext *ctx) {
    JSValue exc = JS_GetException(ctx);
    const char *msg = JS_ToCString(ctx, exc);
    JSValue stack = JS_GetPropertyStr(ctx, exc, "stack");
    const char *stk = JS_IsUndefined(stack) ? NULL : JS_ToCString(ctx, stack);

    size_t len = (msg ? strlen(msg) : 8) + (stk ? strlen(stk) + 1 : 0) + 1;
    char *out = (char *)malloc(len);
    if (out) {
        out[0] = '\0';
        strcat(out, msg ? msg : "JS error");
        if (stk) { strcat(out, "\n"); strcat(out, stk); }
    }

    if (msg) JS_FreeCString(ctx, msg);
    if (stk) JS_FreeCString(ctx, stk);
    JS_FreeValue(ctx, stack);
    JS_FreeValue(ctx, exc);
    return out;
}

// Run queued promise/microtask jobs (e.g. fetch .then handlers) until drained.
static void drain_jobs(JSRuntime *rt) {
    JSContext *ctx1;
    int err;
    do {
        err = JS_ExecutePendingJob(rt, &ctx1);
    } while (err > 0);
}

int qjs_bridge_eval(QJSBridge *b, const char *code, char **err) {
    if (!b || !b->ctx) return -1;
    JSValue v = JS_Eval(b->ctx, code, strlen(code), "<bundle>", JS_EVAL_TYPE_GLOBAL);
    int rc = 0;
    if (JS_IsException(v)) {
        if (err) *err = dup_exception(b->ctx);
        rc = -1;
    }
    JS_FreeValue(b->ctx, v);
    drain_jobs(b->rt);
    return rc;
}

char *qjs_bridge_eval_string(QJSBridge *b, const char *code) {
    if (!b || !b->ctx) return NULL;
    JSValue v = JS_Eval(b->ctx, code, strlen(code), "<eval>", JS_EVAL_TYPE_GLOBAL);
    char *out = NULL;
    if (JS_IsException(v)) {
        JSValue exc = JS_GetException(b->ctx);
        JS_FreeValue(b->ctx, exc);
    } else if (JS_IsString(v)) {
        const char *s = JS_ToCString(b->ctx, v);
        if (s) { out = strdup(s); JS_FreeCString(b->ctx, s); }
    }
    JS_FreeValue(b->ctx, v);
    drain_jobs(b->rt);
    return out;
}
