import {
   Button,
   Container,
   render,
   VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
   generateCssColorVariableName,
   getFirstModeKey,
   isColorValue,
   isVariableAlias,
   cleanVariableName,
   rgbaToHex,
   sortPrimitives,
   formatFontFamily,
   formatSpacingKey,
   generateCssVariableName,
} from "./utils";
import { ColorCollection, ColorVariable, CssVariableSet, CssVariablesObject, OutputStructure, VariableProcessor } from "./types";

/**
 * Configuration map that defines how variables should be organized in the output.
 * This structure determines how different types of variables (colors, spacing, etc.)
 * are grouped and processed.
 */
const outputMap = {
   primitives: [
      {
         collection: "Tailwind Variables",
         others: {
            screens: "breakpoint",
            fontFamily: "font/family",
            fontSize: "font/size",
            fontWeight: "font/weight",
            letterSpacing: "font/letter-spacing",
            lineHeight: "leading",
            borderWidth: "border-width",
            borderRadius: "radius",
            spacing: "spacing",
         },
      },
      {
         collection: " 1. Colors",
         colors: {
            general: true, // all colors go to primitives.colors.general
         },
      },
   ],
   semantics: [
      {
         collection: "Semantic Colors",
         colors: {
            specific: {
               backgroundColor: "background",
               textColor: "text",
               borderColor: "border",
            },
            general: true, // all other colors go to semantics.colors.general
         },
      },
      {
         collection: " 2. Others",
         colors: {
            specific: {
               radius: "radius",
            },
         },
      },
   ],
   components: [
      {
         collection: " 3. Components",
      },
   ],
};

const output = {
   primitives: {
      colors: {
         general: {
            gray: {
               "100": "#fafafa", // Hex colors stay as is
               "200": "#eaeaea",
               "300": "#e3e3e3",
               "400": "#e0e0e0",
               "500": "#d9d9d9",
               "600": "#cacaca",
               "700": "#92939e",
               "800": "#727588",
               "900": "#25283d",
            },
            brand: {
               "100": "#acdeff",
               "200": "#73c7ff",
               "300": "#39b1ff",
               "400": "#009aff",
               "500": "#008ae5",
               "600": "#065fdb",
               "700": "#004eb6",
               "800": "#0f00a0",
               "900": "#0a0066",
            },
            secondary: {
               "100": "#f4faff",
               "200": "#e1e6ef",
               "300": "#b6c3d8",
               "400": "#97abca",
               "500": "#7892bc",
               "600": "#5575aa",
               "700": "#445e88",
               "800": "#334666",
               "900": "#222f44",
            },
         },
         others: {
            screens: {
               xl: "1240px", // Pixel values stay as is with px
               lg: "1024px",
               md: "768px",
               "3xl": "1536px",
               "2xl": "1400px",
               xxs: "360px",
               xs: "375px",
               sm: "640px",
            },
            fontFamily: {
               accent: "Raleway", // No extra quotes needed for font names
               body: "Inter",
            },
            fontSize: {
               xs: "12px",
               sm: "14px",
               base: "16px",
               lg: "18px",
               xl: "20px",
               "2xl": "24px",
               "3xl": "28px",
               "4xl": "32px",
               "5xl": "36px",
               xxs: "10px",
            },
            fontWeight: {
               thin: 100,
               extralight: 200,
               light: 300,
               normal: 400,
               medium: 500,
               semibold: 600,
               bold: 700,
               extrabold: 800,
               black: 900,
            },
            letterSpacing: {
               tighter: "-0.8", // Numbers should be rounded to 1 decimal place
               tight: "-0.4",
               normal: "0",
               wide: "0.4",
               wider: "0.8",
               widest: "1.6",
               "5": "5",
               tightest: "-1",
            },
            lineHeight: {
               "3": "12px",
               "4": "16px",
               "5": "20px",
               "6": "24px",
               "7": "28px",
               "8": "32px",
               "9": "36px",
               "10": "40px",
               none: "0",
            },
            borderWidth: {
               "0": "0px",
               "1": "1px",
               "2": "2px",
               "4": "4px",
               "8": "8px",
            },
            borderRadius: {
               none: "0px",
               sm: "2px",
               DEFAULT: "4px",
               md: "6px",
               lg: "8px",
               xl: "12px",
               "2xl": "16px",
               "3xl": "24px",
               "4xl": "32px",
               full: "9999px",
            },
            spacing: {
               "0": "0px",
               "0.5": "2px", // "0-5" maps to "0.5"
               "1": "4px",
               "1.5": "6px",
               "2": "8px",
            },
         },
      },
      others: { screens: {}, fontFamily: {}, fontSize: {} /*...*/ },
   },
   semantics: {
      colors: {
         backgroundColor: {
            default: "var(--color-background-default)",
            most: "var(--color-background-most)",
            dark: "var(--color-background-dark)",
            brand: "var(--color-background-brand)",
            "brand-less": "var(--color-background-brand-less)",
            accent: "var(--color-background-accent)",
            "accent-less": "var(--color-background-accent-less)",
            "accent-more": "var(--color-background-accent-more)",
            error: "var(--color-background-error)",
            more: "var(--color-background-more)",
            success: "var(--color-background-success)",
            "success-more": "var(--color-background-success-more)",
            warning: "var(--color-background-warning)",
            "warning-more": "var(--color-background-warning-more)",
         },
         textColor: {
            default: "var(--color-text-default)",
            accent: "var(--color-text-accent)",
            inverted: "var(--color-text-inverted)",
            primary: "var(--color-text-primary)",
            error: "var(--color-text-error)",
            warning: "var(--color-text-warning)",
            less: "var(--color-text-less)",
            success: "var(--color-text-success)",
            disabled: "var(--color-text-disabled)",
         },
         borderColor: {
            default: "var(--color-border-default)",
            disabled: "var(--color-border-disabled)",
            active: "var(--color-border-active)",
            error: "var(--color-border-error)",
            less: "var(--color-border-less)",
            success: "var(--color-border-success)",
         },
         general: {
            icon: {
               inverted: "var(--color-icon-inverted)",
               default: "var(--color-icon-default)",
               "accent-red": "var(--color-icon-accent-red)",
               primary: "var(--color-icon-primary)",
               error: "var(--color-icon-error)",
               warning: "var(--color-icon-warning)",
               less: "var(--color-icon-less)",
               accent: "var(--color-icon-accent)",
               success: "var(--color-icon-success)",
               "accent-brand-less": "var(--color-icon-accent-brand-less)",
            },
            link: {
               default: "var(--color-link-default)",
               disabled: "var(--color-link-disabled)",
               active: "var(--color-link-active)",
               visited: "var(--color-link-visited)",
               hover: "var(--color-link-hover)",
               "inverted-default": "var(--color-link-inverted-default)",
               "inverted-disabled": "var(--color-link-inverted-disabled)",
               "inverted-hovered": "var(--color-link-inverted-hovered)",
            },
         },
      },
      others: { screens: {}, fontFamily: {}, fontSize: {} /*...*/ },
   },
   components: {
      input: {
         "bg-default": "var(--color-input-bg-default)",
         "required-star": "var(--color-input-required-star)",
         "bg-active": "var(--color-input-bg-active)",
         "bg-error": "var(--color-input-bg-error)",
         "bg-hover": "var(--color-input-bg-hover)",
      },
      button: {
         "primary-icon-default": "var(--color-button-primary-icon-default)",
         "primary-icon-hovered": "var(--color-button-primary-icon-hovered)",
      },
      badge: {
         text: "var(--color-badge-text)",
      },
      tag: {
         "dark-bg-default": "var(--color-tag-dark-bg-default)",
         "dark-bg-hovered": "var(--color-tag-dark-bg-hovered)",
      },
   },
};

function generateTailwindVariables(
   collection: ColorCollection,
   variableMap: Map<string, string>
): CssVariablesObject {
   const variables: CssVariablesObject = {
      tailwind: {
         screens: [],
         fontFamily: [],
         fontSize: [],
         fontWeight: [],
         letterSpacing: [],
         lineHeight: [],
         borderWidth: [],
         borderRadius: [],
         spacing: [],
      },
   };

   if (!collection.variables) return variables;

   collection.variables.forEach((variable) => {
      const cssVariableName = generateCssVariableName(variable.name);
      variableMap.set(variable.id, cssVariableName);

      const modeKey = getFirstModeKey(variable.valuesByMode);
      if (!modeKey) return;

      const rawValue = variable.valuesByMode[modeKey];
      // Convert the value to a string or number
      let value: string | number = typeof rawValue === 'object' ?
         JSON.stringify(rawValue) : String(rawValue);

      const [category, ...rest] = variable.name.split("/");

      // Round decimal numbers if it's a number
      if (typeof value === "number") {
         value = Number(Number(value).toFixed(1));
      }

      const variableSet: CssVariableSet = {
         name: cssVariableName,
         value: value,
      };

      if (category === "breakpoint") {
         variables.tailwind.screens.push(variableSet);
      } else if (category === "font") {
         if (rest[0] === "family") {
            variableSet.value = `"${value}"`;
            variables.tailwind.fontFamily.push(variableSet);
         } else if (rest[0] === "size") {
            variables.tailwind.fontSize.push(variableSet);
         } else if (rest[0] === "weight") {
            variables.tailwind.fontWeight.push(variableSet);
         } else if (rest[0] === "letter-spacing") {
            variables.tailwind.letterSpacing.push(variableSet);
         }
      } else if (category === "leading") {
         variables.tailwind.lineHeight.push(variableSet);
      } else if (category === "border-width") {
         variables.tailwind.borderWidth.push(variableSet);
      } else if (category === "radius") {
         variables.tailwind.borderRadius.push(variableSet);
      } else if (category === "spacing") {
         variables.tailwind.spacing.push(variableSet);
      }
   });

   return variables;
}

function generateJsMapping(data: ColorCollection[]): string {
   if (!Array.isArray(data) || data.length === 0) return "";

   const result = processVariables(data);
   return JSON.stringify(result, null, 2);
}

/**
 * Helper function to process primitive color variables.
 * Converts Figma color variables into a structured object of hex color values.
 */
function processPrimitives(primitives: ColorVariable[]): {
   colors: { general: Record<string, Record<string, string>> };
} {
   const general: Record<string, Record<string, string>> = {};

   primitives.forEach((variable) => {
      const modeKey = getFirstModeKey(variable.valuesByMode);
      if (!modeKey) return;

      const colorValue = variable.valuesByMode[modeKey];
      if (!isColorValue(colorValue)) return;

      const [category, shade] = variable.name.split("/");
      if (!category || !shade) return;

      if (!general[category]) {
         general[category] = {};
      }
      general[category][shade] = rgbaToHex(colorValue);
   });

   return { colors: { general } };
}

/**
 * Processes semantic color variables into a structured object.
 * Handles background colors, text colors, border colors, and other semantic color categories.
 */
function processSemantics(semantics: ColorVariable[]): {
   colors: {
      backgroundColor: Record<string, string>;
      textColor: Record<string, string>;
      borderColor: Record<string, string>;
      general: Record<string, Record<string, string>>;
   };
} {
   const result: {
      backgroundColor: Record<string, string>;
      textColor: Record<string, string>;
      borderColor: Record<string, string>;
      general: Record<string, Record<string, string>>;
   } = {
      backgroundColor: {},
      textColor: {},
      borderColor: {},
      general: {},
   };

   semantics.forEach((variable) => {
      const modeKey = getFirstModeKey(variable.valuesByMode);
      if (!modeKey) return;

      const value = `var(--color-${variable.name.replace(/\//g, "-")})`;
      const [category, ...rest] = variable.name.split("/");
      const key = rest.join("-");

      if (category === "background") {
         result.backgroundColor[key] = value;
      } else if (category === "text") {
         result.textColor[key] = value;
      } else if (category === "border") {
         result.borderColor[key] = value;
      } else {
         if (!result.general[category]) {
            result.general[category] = {};
         }
         result.general[category][key] = value;
      }
   });

   return { colors: result };
}

function processComponents(
   components: ColorVariable[]
): Record<string, Record<string, string>> {
   const result: Record<string, Record<string, string>> = {};

   components.forEach((variable) => {
      const modeKey = getFirstModeKey(variable.valuesByMode);
      if (!modeKey) return;

      const [component, ...rest] = variable.name.split("/");
      if (!result[component]) {
         result[component] = {};
      }

      result[component][rest.join("-")] = `var(--color-${variable.name.replace(
         /\//g,
         "-"
      )})`;
   });

   return result;
}

/**
 * Processes Tailwind-specific variables (spacing, typography, etc.).
 * Converts Figma variables into Tailwind-compatible format.
 */
function processTailwind(variables: ColorVariable[]): {
   others: Record<string, Record<string, string>>;
} {
   const others: Record<string, Record<string, string>> = {
      screens: {},
      fontFamily: {},
      fontSize: {},
      fontWeight: {},
      letterSpacing: {},
      lineHeight: {},
      borderWidth: {},
      borderRadius: {},
      spacing: {},
   };

   variables.forEach((variable) => {
      const modeKey = getFirstModeKey(variable.valuesByMode);
      if (!modeKey) return;

      const rawValue = variable.valuesByMode[modeKey];
      // Convert to string/number first
      const stringValue = typeof rawValue === 'object' ?
         JSON.stringify(rawValue) : String(rawValue);
      const [category, ...rest] = variable.name.split("/");
      let key = cleanVariableName(variable.name);

      if (category === "breakpoint") {
         others.screens[key] = `${stringValue}px`;
      } else if (category === "font") {
         if (rest[0] === "family") {
            others.fontFamily[key] = formatFontFamily(stringValue);
         } else if (rest[0] === "size") {
            others.fontSize[key] = `${stringValue}px`;
         } else if (rest[0] === "weight") {
            others.fontWeight[key] = stringValue;
         } else if (rest[0] === "letter-spacing") {
            others.letterSpacing[key] = Number(stringValue).toFixed(1);
         }
      } else if (category === "leading") {
         others.lineHeight[key] = `${stringValue}px`;
      } else if (category === "border-width") {
         others.borderWidth[key] = `${stringValue}px`;
      } else if (category === "radius") {
         others.borderRadius[key] = `${stringValue}px`;
      } else if (category === "spacing") {
         key = formatSpacingKey(key);
         others.spacing[key] = typeof rawValue === 'number' ?
            `${rawValue}px` : stringValue;
      }
   });

   return { others };
}

/**
 * Generates CSS custom properties from all variable collections.
 * Handles primitive colors, semantic colors, and component-specific colors.
 */
function generateCssFromAllCollections(data: ColorCollection[]): string {
   const cssLines: string[] = [":root {"];
   // Create a map of variable IDs to their names
   const variableMap = new Map<string, string>();

   // First pass: build the variable map
   data.forEach((collection) => {
      collection.variables?.forEach((variable) => {
         variableMap.set(variable.id, variable.name);
      });
   });

   // Process Tailwind variables
   const tailwindCollection = data.find((c) => c.name === "Tailwind setup");
   const tailwindVariables = generateTailwindVariables(
      tailwindCollection || { name: "Tailwind setup", variables: [] },
      variableMap
   );

   // Add Tailwind variables
   cssLines.push("  /* Tailwind Variables */");
   Object.entries(tailwindVariables.tailwind).forEach(([category, vars]) => {
      if (vars.length > 0) {
         cssLines.push(`  /* ${category} */`);
         vars.forEach((variable) => {
            cssLines.push(`  ${variable.name}: ${variable.value};`);
         });
         cssLines.push("");
      }
   });

   // Process Primitives (Colors only)
   const primitiveCollection = data.find((c) => c.name === " 1. Colors");
   if (primitiveCollection?.variables) {
      cssLines.push("  /* Primitives */");
      const sortedVariables = sortPrimitives(primitiveCollection.variables);
      sortedVariables.forEach((variable) => {
         const modeKey = getFirstModeKey(variable.valuesByMode);
         if (!modeKey) return;

         const value = variable.valuesByMode[modeKey];
         if (isColorValue(value)) {
            const cssVarName = generateCssColorVariableName(variable.name);
            cssLines.push(`  ${cssVarName}: ${rgbaToHex(value)};`);
         }
      });
      cssLines.push("");
   }

   // Process Semantic Colors
   const semanticCollection = data.find((c) => c.name === "Semantic colors");
   if (semanticCollection?.variables) {
      cssLines.push("  /* Semantic Colors */");
      semanticCollection.variables.forEach((variable) => {
         const modeKey = getFirstModeKey(variable.valuesByMode);
         if (!modeKey) return;

         const value = variable.valuesByMode[modeKey];
         if (isColorValue(value)) {
            const cssVarName = generateCssColorVariableName(variable.name);
            cssLines.push(`  ${cssVarName}: ${rgbaToHex(value)};`);
         } else if (isVariableAlias(value)) {
            const cssVarName = generateCssColorVariableName(variable.name);
            const referencedVarName = variableMap.get(value.id);
            if (referencedVarName) {
               const referencedVar =
                  generateCssColorVariableName(referencedVarName);
               cssLines.push(`  ${cssVarName}: var(${referencedVar});`);
            }
         }
      });
      cssLines.push("");
   }

   // Process Component Colors
   const componentCollection = data.find((c) => c.name === " 3. Components");
   if (componentCollection?.variables) {
      cssLines.push("  /* Component Colors */");
      componentCollection.variables.forEach((variable) => {
         const modeKey = getFirstModeKey(variable.valuesByMode);
         if (!modeKey) return;

         const value = variable.valuesByMode[modeKey];
         if (isColorValue(value)) {
            const cssVarName = generateCssColorVariableName(variable.name);
            cssLines.push(`  ${cssVarName}: ${rgbaToHex(value)};`);
         } else if (isVariableAlias(value)) {
            const cssVarName = generateCssColorVariableName(variable.name);
            const referencedVarName = variableMap.get(value.id);
            if (referencedVarName) {
               const referencedVar =
                  generateCssColorVariableName(referencedVarName);
               cssLines.push(`  ${cssVarName}: var(${referencedVar});`);
            }
         }
      });
      cssLines.push("");
   }

   cssLines.push("}");
   return cssLines.join("\n");
}


/**
 * Processes all variable collections and organizes them into the final output structure.
 * This is the main function that coordinates the processing of different variable types.
 */
function processVariables(collections: ColorCollection[]): OutputStructure {
   const result: OutputStructure = {
      primitives: {
         colors: { general: {} },
         others: {
            screens: {},
            fontFamily: {},
            fontSize: {},
            fontWeight: {},
            letterSpacing: {},
            lineHeight: {},
            borderWidth: {},
            borderRadius: {},
            spacing: {},
         }
      },
      semantics: {
         colors: {
            backgroundColor: {},
            textColor: {},
            borderColor: {},
            general: {},
         },
      },
      components: {},
   };

   collections.forEach((collection) => {
      if (collection.name === " 1. Colors") {
         Object.assign(
            result.primitives,
            processPrimitives(collection.variables || [])
         );
      } else if (collection.name === "Tailwind setup") {
         Object.assign(
            result.primitives,
            processTailwind(collection.variables || [])
         );
      } else if (collection.name === "Semantic colors") {
         Object.assign(
            result.semantics,
            processSemantics(collection.variables || [])
         );
      } else if (collection.name === " 3. Components") {
         result.components = processComponents(collection.variables || []);
      }
   });

   return result;
}

/**
 * Helper functions for processing different types of variables
 */
function processColorValue(variable: ColorVariable): string | null {
   const modeKey = getFirstModeKey(variable.valuesByMode);
   if (!modeKey) return null;

   const value = variable.valuesByMode[modeKey];
   if (isColorValue(value)) {
      return rgbaToHex(value);
   }
   return null;
}

function processSemanticValue(variable: ColorVariable, variableMap: Map<string, string>): string | null {
   const modeKey = getFirstModeKey(variable.valuesByMode);
   if (!modeKey) return null;

   const value = variable.valuesByMode[modeKey];
   if (isColorValue(value)) {
      return rgbaToHex(value);
   } else if (isVariableAlias(value)) {
      const referencedVarName = variableMap.get(value.id);
      if (referencedVarName) {
         return `var(${generateCssColorVariableName(referencedVarName)})`;
      }
   }
   return null;
}

function formatTailwindValue(variable: ColorVariable): string | null {
   const modeKey = getFirstModeKey(variable.valuesByMode);
   if (!modeKey) return null;

   const rawValue = variable.valuesByMode[modeKey];
   // Convert the raw value to a string or number
   const value = typeof rawValue === 'object' ?
      JSON.stringify(rawValue) : String(rawValue);

   const [category, ...rest] = variable.name.split("/");

   if (category === "breakpoint") {
      return `${value}px`;
   } else if (category === "font") {
      if (rest[0] === "family") {
         return `"${formatFontFamily(String(value))}"`;
      } else if (rest[0] === "size") {
         return `${value}px`;
      } else if (rest[0] === "weight") {
         return String(value);
      } else if (rest[0] === "letter-spacing") {
         const numValue = Number(value);
         return !isNaN(numValue) ? numValue.toFixed(1) : String(value);
      }
   } else if (category === "leading") {
      return `${value}px`;
   } else if (category === "border-width") {
      return `${value}px`;
   } else if (category === "radius") {
      return `${value}px`;
   } else if (category === "spacing") {
      return typeof value === "number" ? `${value}px` : String(value);
   }
   return null;
}

/**
 * Configuration for processing different types of variables.
 * Each processor handles a specific type of variable collection.
 */


const collectionProcessors: Record<string, VariableProcessor> = {
   "Tailwind setup": {
      prefix: "tw",
      transform: (variable, _) => ({
         name: generateCssVariableName(variable.name),
         value: formatTailwindValue(variable)
      })
   },
   " 1. Colors": {
      prefix: "color",
      transform: (variable, _) => ({
         name: generateCssColorVariableName(variable.name),
         value: processColorValue(variable)
      })
   },
   "Semantic colors": {
      prefix: "semantic",
      transform: (variable, variableMap) => ({
         name: generateCssColorVariableName(variable.name),
         value: processSemanticValue(variable, variableMap)
      })
   },
   " 3. Components": {
      prefix: "component",
      transform: (variable, variableMap) => ({
         name: generateCssColorVariableName(variable.name),
         value: processSemanticValue(variable, variableMap)
      })
   }
};

// Unified processor
function processCollection(
   collection: ColorCollection,
   variableMap: Map<string, string>
): { name: string; value: string }[] {
   const processor = collectionProcessors[collection.name];
   if (!processor || !collection.variables) return [];

   return collection.variables
      .map(variable => {
         const result = processor.transform(variable, variableMap);
         return result.value ? { name: result.name, value: result.value } : null;
      })
      .filter((result): result is { name: string; value: string } => result !== null);
}

// Simplified CSS generation
function generateCss(collections: ColorCollection[]): string {
   const variableMap = new Map<string, string>();

   // Build variable map
   collections.forEach(collection => {
      collection.variables?.forEach(variable => {
         variableMap.set(variable.id, variable.name);
      });
   });

   // Process all collections and generate CSS
   const cssVariables = collections.flatMap(collection =>
      processCollection(collection, variableMap)
   );

   // Group variables by type for better organization
   const groupedVariables = cssVariables.reduce((acc, { name, value }) => {
      const type = name.split('-')[1]; // Get variable type (color, font, etc.)
      if (!acc[type]) acc[type] = [];
      acc[type].push({ name, value });
      return acc;
   }, {} as Record<string, { name: string; value: string }[]>);

   // Generate CSS with grouped variables
   const cssLines = ['@theme {'];

   Object.entries(groupedVariables).forEach(([type, variables]) => {
      cssLines.push(`  /* ${type.charAt(0).toUpperCase() + type.slice(1)} Variables */`);
      variables.forEach(({ name, value }) => {
         cssLines.push(`  ${name}: ${value};`);
      });
      cssLines.push('');
   });

   cssLines.push('}');
   return cssLines.join('\n');
}

type OutputState = {
   css: string;
   js: string;
};

/**
 * Main UI component that renders the export interface.
 * Handles user interactions and displays the generated CSS/JS output.
 */
function Plugin() {
   const [output, setOutput] = useState<OutputState>({ css: '', js: '' });
   const [activeTab, setActiveTab] = useState<'css' | 'json'>('css');

   useEffect(() => {
      const handleSetVariables = (result: ColorCollection[]) => {
         setOutput({
            css: generateCss(result),
            js: generateJsMapping(result)
         });
      };

      return on("SET_VARIABLES", handleSetVariables);
   }, []);

   return (
      <Container space="medium">
         <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <Button fullWidth onClick={() => emit("GET_VARIABLES")}>
               Export Variables
            </Button>
            <Button onClick={() => setActiveTab('css')} secondary={activeTab !== 'css'}>
               CSS
            </Button>
            <Button onClick={() => setActiveTab('json')} secondary={activeTab !== 'json'}>
               JSON
            </Button>
         </div>
         <VerticalSpace space="small" />
         <div style={{ height: "600px", border: "1px solid #ccc" }}>
            <textarea
               readOnly
               value={activeTab === 'css' ? output.css : output.js}
               style={{
                  width: "100%",
                  height: "100%",
                  padding: "12px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  backgroundColor: "#1e1e1e",
                  color: "#d4d4d4",
                  border: "none",
                  resize: "none",
                  outline: "none"
               }}
            />
         </div>
      </Container>
   );
}

export default render(Plugin);