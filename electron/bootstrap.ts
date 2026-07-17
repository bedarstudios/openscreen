import { app } from "electron";
import { prepareShowhowUserData } from "./userDataMigration";

app.setName("Showhow");
const selection = prepareShowhowUserData(app.getPath("appData"));
app.setPath("userData", selection.path);
console.info("Showhow user-data profile:", selection.path);
if (selection.migratedFrom) {
	console.info("Migrated legacy profile from:", selection.migratedFrom, "to:", selection.path);
}
if (selection.usedLegacyFallback) {
	console.warn("Using legacy user-data profile after migration failure:", selection.path);
}

await import("./main");
