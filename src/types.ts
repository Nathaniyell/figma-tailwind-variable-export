export type ColorValue = {
    r: number;
    g: number;
    b: number;
    a: number;
 };
 export type VariableAlias = {
    type: "VARIABLE_ALIAS";
    id: string;
};
 
 export type ValueByMode = ColorValue | VariableAlias;
 
 export type ColorVariable = {
    id: string;
    name: string;
    resolvedType: string;
    valuesByMode: {
       [key: string]: ValueByMode;
    };
 };
 export type ColorCollection = {
    name: string;
    variables: ColorVariable[];
 };

 export type OutputStructure = {
    primitives: {
       colors: {
          general: Record<string, Record<string, string>>;
       };
       others: {
          screens: Record<string, string>;
          fontFamily: Record<string, string>;
          fontSize: Record<string, string>;
          fontWeight: Record<string, string>;
          letterSpacing: Record<string, string>;
          lineHeight: Record<string, string>;
          borderWidth: Record<string, string>;
          borderRadius: Record<string, string>;
          spacing: Record<string, string>;
       };
    };
    semantics: {
       colors: {
          backgroundColor: Record<string, string>;
          textColor: Record<string, string>;
          borderColor: Record<string, string>;
          general: Record<string, Record<string, string>>;
       };
    };
    components: Record<string, Record<string, string>>;
 };
export type VariableProcessor = {
    prefix: string;
    transform: (variable: ColorVariable, variableMap: Map<string, string>) => { name: string; value: string | null };
 }; 

 export type CssVariableSet = {
    name: string;
    value: string | number;
    category?: string;
    comment?: string;
 };
 
 export type CssVariablesObject = {
    tailwind: {
       screens: CssVariableSet[];
       fontFamily: CssVariableSet[];
       fontSize: CssVariableSet[];
       fontWeight: CssVariableSet[];
       letterSpacing: CssVariableSet[];
       lineHeight: CssVariableSet[];
       borderWidth: CssVariableSet[];
       borderRadius: CssVariableSet[];
       spacing: CssVariableSet[];
    };
 };