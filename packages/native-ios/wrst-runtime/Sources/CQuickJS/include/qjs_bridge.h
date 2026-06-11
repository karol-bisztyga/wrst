#ifndef QJS_BRIDGE_H
#define QJS_BRIDGE_H

// Thin C API over QuickJS so Swift never touches JSValue or the value macros.
// Swift only sees opaque pointers and C strings.
typedef struct QJSBridge QJSBridge;

// Create / destroy a runtime+context with the `native` bridge installed.
QJSBridge *qjs_bridge_create(void);
void qjs_bridge_destroy(QJSBridge *b);

// Evaluate code for side effects (bundle load, call(id)). Returns 0 on success;
// on error returns -1 and, if err != NULL, sets *err to a malloc'd message
// (caller frees).
int qjs_bridge_eval(QJSBridge *b, const char *code, char **err);

// Evaluate code expected to yield a string (e.g. JSON.stringify(render())).
// Returns a malloc'd C string (caller frees) or NULL on error / non-string.
char *qjs_bridge_eval_string(QJSBridge *b, const char *code);

#endif
