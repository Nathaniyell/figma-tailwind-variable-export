import { JSX as PreactJSX } from 'preact';

declare global {
    namespace JSX {
        type Element = PreactJSX.Element;
        type ElementClass = PreactJSX.ElementClass;
        type ElementAttributesProperty = PreactJSX.ElementAttributesProperty;
        type ElementChildrenAttribute = PreactJSX.ElementChildrenAttribute;
        type IntrinsicElements = PreactJSX.IntrinsicElements;
    }
}

declare module 'react' {
    export = preact;
} 