import { once, showUI, on, emit } from "@create-figma-plugin/utilities";

export default function () {
   // Check if variables API is available
   if (!figma.variables) {
      figma.notify("This plugin requires variables support. Please update your Figma version.");
      figma.closePlugin();
      return;
   }

   on("GET_VARIABLES", async function () {
      try {
         console.log("Fetching variables...");
         const collections = await figma.variables.getLocalVariableCollectionsAsync();
         console.log("Collections found:", collections.length);

         const variables = await figma.variables.getLocalVariables();
         console.log("Variables found:", variables.length);

         // Filter out empty collections
         const result = collections
            .filter(collection => {
               const collectionVars = variables.filter(v => v.variableCollectionId === collection.id);
               return collectionVars.length > 0;
            })
            .map((collection) => ({
               id: collection.id,
               name: collection.name,
               modes: collection.modes.map(mode => ({
                  modeId: mode.modeId,
                  name: mode.name
               })),
               variables: variables
                  .filter((v) => v.variableCollectionId === collection.id)
                  .map((v) => ({
                     id: v.id,
                     name: v.name,
                     resolvedType: v.resolvedType,
                     valuesByMode: v.valuesByMode,
                     scopes: v.scopes,
                     codeSyntax: v.codeSyntax,
                     description: v.description || ""
                  })),
            }));

         console.log("Processed collections:", result.length);
         console.log("First collection:", result[0] ? result[0].name : "No collections");

         emit("SET_VARIABLES", result);
         figma.notify("Variables processed: " + variables.length);
      } catch (error) {
         figma.notify("Error fetching variables: " + (error as Error).message, { error: true });
         console.error("Error:", error);
      }
   });

   // Handle export completion
   on("EXPORT_COMPLETE", function (success: boolean) {
      if (success) {
         figma.notify("Variables exported successfully!");
      }
   });

   // Handle plugin close
   on("CLOSE_PLUGIN", function () {
      figma.closePlugin();
   });

   // Show the UI with specific dimensions
   showUI({
      height: 650,
      width: 800,
      title: "Figma to Tailwind Variable Export"
   });
}
