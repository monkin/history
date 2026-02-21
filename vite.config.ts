import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        dts({
            rollupTypes: true,
        }),
    ],
    build: {
        lib: {
            entry: "./src/index.ts",
            name: "history",
            fileName: (format) => `history.${format === "es" ? "js" : "cjs"}`,
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {},
            },
        },
    },
});
