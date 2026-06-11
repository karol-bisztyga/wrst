package com.wrst.runtime

// Registry of host-provided native modules - the extension hook, and the
// Android twin of the iOS `WrstNativeModules`.
//
// A thin app shell registers a capability (e.g. in MainActivity.onCreate,
// before setContent) with the SAME call shape as iOS:
//
//   WrstNativeModules.register("hello") { args ->
//       Log.d("wrst", "hello from native module")
//       "hello from native module"
//   }
//
// App JS reaches it via `callNativeModule("hello", ...args)`. `args` is the
// decoded JSON argument array; the return value (if any) is JSON-encoded back
// to JS. Return `null` for no result. The engine binary is untouched - this is
// the one dispatch channel; modules live here, in the shell.
object WrstNativeModules {
    private val handlers = mutableMapOf<String, (args: List<Any?>) -> Any?>()

    fun register(name: String, handler: (args: List<Any?>) -> Any?) {
        handlers[name] = handler
    }

    internal fun handler(name: String): ((List<Any?>) -> Any?)? = handlers[name]
}
