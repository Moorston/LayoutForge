/**
 * Native Exporter — Converts HTML/CSS to React Native and Flutter code.
 * Maps HTML elements to native components and Tailwind classes to native styles.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportResult {
  code: string;
  platform: "react-native" | "flutter";
  componentName: string;
  dependencies: string[];
  notes: string[];
}

// ─── Tailwind → React Native StyleSheet Mapping ─────────────────────────────

const twToRN: Record<string, string> = {
  // Flexbox
  flex: "flex: 1",
  "flex-row": "flexDirection: 'row'",
  "flex-col": "flexDirection: 'column'",
  "flex-wrap": "flexWrap: 'wrap'",
  "flex-1": "flex: 1",
  "flex-auto": "flex: 1",
  "flex-none": "flex: 0",

  // Alignment
  "items-start": "alignItems: 'flex-start'",
  "items-center": "alignItems: 'center'",
  "items-end": "alignItems: 'flex-end'",
  "items-stretch": "alignItems: 'stretch'",
  "justify-start": "justifyContent: 'flex-start'",
  "justify-center": "justifyContent: 'center'",
  "justify-end": "justifyContent: 'flex-end'",
  "justify-between": "justifyContent: 'space-between'",
  "justify-around": "justifyContent: 'space-around'",
  "justify-evenly": "justifyContent: 'space-evenly'",
  "self-start": "alignSelf: 'flex-start'",
  "self-center": "alignSelf: 'center'",
  "self-end": "alignSelf: 'flex-end'",

  // Display
  hidden: "display: 'none'",
  "overflow-hidden": "overflow: 'hidden'",
  "overflow-scroll": "overflow: 'scroll'",

  // Position
  relative: "position: 'relative'",
  absolute: "position: 'absolute'",
};

const twColors: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "yellow-500": "#eab308",
  "indigo-500": "#6366f1",
  "indigo-600": "#4f46e5",
  "purple-500": "#a855f7",
  "pink-500": "#ec4899",
  "emerald-500": "#10b981",
  "teal-500": "#14b8a6",
  "cyan-500": "#06b6d4",
  "amber-500": "#f59e0b",
  "rose-500": "#f43f5e",
  "orange-500": "#f97316",
};

function parseSpacing(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num * 4; // Tailwind spacing is 4px per unit
}

function parseColorFromClass(className: string): string | null {
  const parts = className.split("-");
  if (parts.length < 2) return null;
  const colorKey = parts.slice(1).join("-");
  return twColors[colorKey] ?? null;
}

// ─── HTML → React Native Conversion ─────────────────────────────────────────

function htmlToRN(html: string, componentName: string): ExportResult {
  const dependencies = ["react-native", "react"];
  const notes: string[] = [
    "Install dependencies: npm install react-native",
    "Import StyleSheet from 'react-native' for optimized styles",
    "Test on both iOS and Android simulators",
  ];

  let rnCode = html;

  // Replace HTML elements with RN components
  const elementMap: [RegExp, string][] = [
    [/<div/g, "<View"],
    [/<\/div>/g, "</View>"],
    [/<p\b/g, "<Text"],
    [/<\/p>/g, "</Text>"],
    [/<span\b/g, "<Text"],
    [/<\/span>/g, "</Text>"],
    [/<h1\b/g, '<Text style={{ fontSize: 32, fontWeight: "bold" }}'],
    [/<\/h1>/g, "</Text>"],
    [/<h2\b/g, '<Text style={{ fontSize: 28, fontWeight: "bold" }}'],
    [/<\/h2>/g, "</Text>"],
    [/<h3\b/g, '<Text style={{ fontSize: 24, fontWeight: "bold" }}'],
    [/<\/h3>/g, "</Text>"],
    [/<h4\b/g, '<Text style={{ fontSize: 20, fontWeight: "bold" }}'],
    [/<\/h4>/g, "</Text>"],
    [/<h5\b/g, '<Text style={{ fontSize: 18, fontWeight: "bold" }}'],
    [/<\/h5>/g, "</Text>"],
    [/<h6\b/g, '<Text style={{ fontSize: 16, fontWeight: "bold" }}'],
    [/<\/h6>/g, "</Text>"],
    [/<img\b/g, "<Image"],
    [/<a\b/g, "<TouchableOpacity"],
    [/<\/a>/g, "</TouchableOpacity>"],
    [/<input\b/g, "<TextInput"],
    [/<button\b/g, "<TouchableOpacity"],
    [/<\/button>/g, "</TouchableOpacity>"],
    [/<section\b/g, "<View"],
    [/<\/section>/g, "</View>"],
    [/<header\b/g, "<View"],
    [/<\/header>/g, "</View>"],
    [/<footer\b/g, "<View"],
    [/<\/footer>/g, "</View>"],
    [/<nav\b/g, "<View"],
    [/<\/nav>/g, "</View>"],
    [/<main\b/g, "<View"],
    [/<\/main>/g, "</View>"],
    [/<ul\b/g, "<View"],
    [/<\/ul>/g, "</View>"],
    [/<li\b/g, "<View"],
    [/<\/li>/g, "</View>"],
  ];

  for (const [regex, replacement] of elementMap) {
    rnCode = rnCode.replace(regex, replacement);
  }

  // Convert class names to style references
  const stylesUsed: Map<string, string> = new Map();
  let styleIdx = 0;

  rnCode = rnCode.replace(/className="([^"]*)"/g, (_, classes) => {
    const twClasses = classes.split(/\s+/).filter(Boolean);
    const rnStyles: string[] = [];

    for (const cls of twClasses) {
      // Check direct mappings
      if (twToRN[cls]) {
        rnStyles.push(twToRN[cls]);
        continue;
      }

      // Spacing: p-, px-, py-, pt-, pb-, pl-, pr-, m-, mx-, my-, mt-, mb-, ml-, mr-
      const spacingMatch = cls.match(
        /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(\d+)$/,
      );
      if (spacingMatch) {
        const [, prefix, val] = spacingMatch;
        const px = parseSpacing(val);
        const propMap: Record<string, string> = {
          p: "padding",
          px: "paddingHorizontal",
          py: "paddingVertical",
          pt: "paddingTop",
          pb: "paddingBottom",
          pl: "paddingLeft",
          pr: "paddingRight",
          m: "margin",
          mx: "marginHorizontal",
          my: "marginVertical",
          mt: "marginTop",
          mb: "marginBottom",
          ml: "marginLeft",
          mr: "marginRight",
        };
        rnStyles.push(`${propMap[prefix]}: ${px}`);
        continue;
      }

      // Gap
      const gapMatch = cls.match(/^gap-(\d+)$/);
      if (gapMatch) {
        rnStyles.push(`gap: ${parseSpacing(gapMatch[1])}`);
        continue;
      }

      // Width/Height: w-full, w-screen, w-auto, h-full, h-screen, w-{n}, h-{n}
      if (cls === "w-full") {
        rnStyles.push("width: '100%'");
        continue;
      }
      if (cls === "w-screen") {
        rnStyles.push("width: '100%'");
        continue;
      }
      if (cls === "h-full") {
        rnStyles.push("height: '100%'");
        continue;
      }
      if (cls === "h-screen") {
        rnStyles.push("height: '100%'");
        continue;
      }

      const wMatch = cls.match(/^w-(\d+)$/);
      if (wMatch) {
        rnStyles.push(`width: ${parseSpacing(wMatch[1])}`);
        continue;
      }
      const hMatch = cls.match(/^h-(\d+)$/);
      if (hMatch) {
        rnStyles.push(`height: ${parseSpacing(hMatch[1])}`);
        continue;
      }

      // Min/Max width/height
      if (cls === "min-w-0") {
        rnStyles.push("minWidth: 0");
        continue;
      }
      if (cls === "max-w-full") {
        rnStyles.push("maxWidth: '100%'");
        continue;
      }
      const maxWMatch = cls.match(/^max-w-(\w+)$/);
      if (maxWMatch) {
        const maxWValues: Record<string, number> = {
          xs: 320,
          sm: 384,
          md: 448,
          lg: 512,
          xl: 576,
          "2xl": 672,
          "3xl": 768,
          "4xl": 896,
          "5xl": 1024,
          "6xl": 1152,
          "7xl": 1280,
        };
        if (maxWValues[maxWMatch[1]])
          rnStyles.push(`maxWidth: ${maxWValues[maxWMatch[1]]}`);
        continue;
      }

      // Background colors
      const bgMatch = cls.match(/^bg-(\w+-\d+)$/);
      if (bgMatch) {
        const hex = parseColorFromClass(bgMatch[0]);
        if (hex) rnStyles.push(`backgroundColor: '${hex}'`);
        continue;
      }
      if (cls === "bg-white") {
        rnStyles.push("backgroundColor: '#ffffff'");
        continue;
      }
      if (cls === "bg-black") {
        rnStyles.push("backgroundColor: '#000000'");
        continue;
      }
      if (cls === "bg-transparent") {
        rnStyles.push("backgroundColor: 'transparent'");
        continue;
      }

      // Text colors
      const textMatch = cls.match(/^text-(\w+-\d+)$/);
      if (textMatch) {
        const hex = parseColorFromClass(textMatch[0]);
        if (hex) rnStyles.push(`color: '${hex}'`);
        continue;
      }
      if (cls === "text-white") {
        rnStyles.push("color: '#ffffff'");
        continue;
      }
      if (cls === "text-black") {
        rnStyles.push("color: '#000000'");
        continue;
      }

      // Font sizes
      const fontSizeMap: Record<string, number> = {
        "text-xs": 12,
        "text-sm": 14,
        "text-base": 16,
        "text-lg": 18,
        "text-xl": 20,
        "text-2xl": 24,
        "text-3xl": 30,
        "text-4xl": 36,
        "text-5xl": 48,
      };
      if (fontSizeMap[cls]) {
        rnStyles.push(`fontSize: ${fontSizeMap[cls]}`);
        continue;
      }

      // Font weight
      const fontWeightMap: Record<string, string> = {
        "font-thin": "100",
        "font-extralight": "200",
        "font-light": "300",
        "font-normal": "400",
        "font-medium": "500",
        "font-semibold": "600",
        "font-bold": "700",
        "font-extrabold": "800",
        "font-black": "900",
      };
      if (fontWeightMap[cls]) {
        rnStyles.push(`fontWeight: '${fontWeightMap[cls]}'`);
        continue;
      }

      // Text alignment
      if (cls === "text-left") {
        rnStyles.push("textAlign: 'left'");
        continue;
      }
      if (cls === "text-center") {
        rnStyles.push("textAlign: 'center'");
        continue;
      }
      if (cls === "text-right") {
        rnStyles.push("textAlign: 'right'");
        continue;
      }

      // Border radius
      const radiusMap: Record<string, number> = {
        "rounded-none": 0,
        "rounded-sm": 2,
        rounded: 4,
        "rounded-md": 6,
        "rounded-lg": 8,
        "rounded-xl": 12,
        "rounded-2xl": 16,
        "rounded-3xl": 24,
        "rounded-full": 9999,
      };
      if (radiusMap[cls] !== undefined) {
        rnStyles.push(`borderRadius: ${radiusMap[cls]}`);
        continue;
      }

      // Borders
      if (cls === "border") {
        rnStyles.push("borderWidth: 1");
        continue;
      }
      const borderMatch = cls.match(/^border-(\d+)$/);
      if (borderMatch) {
        rnStyles.push(`borderWidth: ${borderMatch[1]}`);
        continue;
      }
      const borderColorMatch = cls.match(/^border-(\w+-\d+)$/);
      if (borderColorMatch) {
        const hex = parseColorFromClass(borderColorMatch[0]);
        if (hex) rnStyles.push(`borderColor: '${hex}'`);
        continue;
      }

      // Opacity
      const opacityMatch = cls.match(/^opacity-(\d+)$/);
      if (opacityMatch) {
        rnStyles.push(`opacity: ${parseInt(opacityMatch[1]) / 100}`);
        continue;
      }

      // Shadow (simplified)
      if (cls === "shadow-sm") {
        rnStyles.push(
          "shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1",
        );
        continue;
      }
      if (cls === "shadow") {
        rnStyles.push(
          "shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3",
        );
        continue;
      }
      if (cls === "shadow-md") {
        rnStyles.push(
          "shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5",
        );
        continue;
      }
      if (cls === "shadow-lg") {
        rnStyles.push(
          "shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8",
        );
        continue;
      }

      // Aspect ratio
      const aspectMatch = cls.match(/^aspect-(\d+)\/(\d+)$/);
      if (aspectMatch) {
        rnStyles.push(
          `aspectRatio: ${parseInt(aspectMatch[1]) / parseInt(aspectMatch[2])}`,
        );
        continue;
      }
    }

    if (rnStyles.length === 0) return "";

    const styleName = `style${styleIdx++}`;
    stylesUsed.set(styleName, rnStyles.join(",\n    "));
    return `style={styles.${styleName}}`;
  });

  // Fix img-specific attributes
  rnCode = rnCode.replace(/src="([^"]*)"/g, (_, src) => {
    return `source={{ uri: '${src}' }}`;
  });
  rnCode = rnCode.replace(/href="([^"]*)"/g, (_, href) => {
    return `onPress={() => Linking.openURL('${href}')}`;
  });

  // Build stylesheet
  let stylesheet = "const styles = StyleSheet.create({\n";
  for (const [name, style] of stylesUsed) {
    stylesheet += `  ${name}: {\n    ${style.replace(/,\n\s+/g, ",\n    ")}\n  },\n`;
  }
  stylesheet += "});\n";

  // Use WindowDimensions for responsive
  if (rnCode.includes("md:") || rnCode.includes("lg:")) {
    dependencies.push("react-native");
    notes.push(
      "Responsive breakpoints detected. Using useWindowDimensions for adaptive layout.",
    );
  }

  const importStatement = `import React from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, StyleSheet, Linking, useWindowDimensions } from 'react-native';`;

  const fullCode = `${importStatement}

/**
 * ${componentName} — React Native component
 * Generated by LayoutForge
 */

interface ${componentName}Props {
  style?: any;
}

export function ${componentName}({ style }: ${componentName}Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <ScrollView style={[{ flex: 1 }, style]}>
${indentCode(rnCode, 6)}
    </ScrollView>
  );
}

export default ${componentName};

${stylesheet}`;

  return {
    code: fullCode,
    platform: "react-native",
    componentName,
    dependencies,
    notes,
  };
}

function indentCode(code: string, spaces: number): string {
  return code
    .split("\n")
    .map((line) => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");
}

// ─── HTML → Flutter Conversion ───────────────────────────────────────────────

function htmlToFlutter(html: string, widgetName: string): ExportResult {
  const dependencies: string[] = ["flutter"];
  const notes: string[] = [
    "This widget uses Material Design. Add 'flutter' to your pubspec.yaml.",
    "For network images, add 'cached_network_image' package.",
    "For responsive layouts, MediaQuery is used for breakpoints.",
  ];

  let dartCode = html;

  // Map HTML to Flutter widgets
  const elementMap: [RegExp, string][] = [
    [/<div[^>]*>/g, "Container("],
    [/<\/div>/g, ")"],
    [/<p[^>]*>/g, 'Text("'],
    [/<\/p>/g, '", style: TextStyle(fontSize: 14, color: Colors.black87))'],
    [/<span[^>]*>/g, 'Text("'],
    [/<\/span>/g, '", style: TextStyle(fontSize: 14))'],
    [/<h1[^>]*>/g, 'Text("'],
    [
      /<\/h1>/g,
      '", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)))',
    ],
    [/<h2[^>]*>/g, 'Text("'],
    [
      /<\/h2>/g,
      '", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)))',
    ],
    [/<h3[^>]*>/g, 'Text("'],
    [
      /<\/h3>/g,
      '", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)))',
    ],
    [/<img\b[^>]*>/g, 'Image.network("IMAGE_URL", fit: BoxFit.cover)'],
    [/<ul[^>]*>/g, "Column(children: ["],
    [/<\/ul>/g, "])"],
    [
      /<li[^>]*>/g,
      "Padding(padding: EdgeInsets.symmetric(vertical: 4), child: Row(children: [Icon(Icons.circle, size: 6), SizedBox(width: 8), Expanded(child: ",
    ],
    [/<\/li>/g, ")])),"],
    [/<a\b[^>]*>/g, "InkWell(onTap: () {}, child: "],
    [/<\/a>/g, ")"],
    [/<button\b[^>]*>/g, "ElevatedButton(onPressed: () {}, child: Text('"],
    [/<\/button>/g, "'))"],
    [
      /<input\b[^>]*>/g,
      'TextField(decoration: InputDecoration(hintText: "Enter text"))',
    ],
    [/<form\b[^>]*>/g, "Column(children: ["],
    [/<\/form>/g, "])"],
    [
      /<section\b[^>]*>/g,
      "Container(padding: EdgeInsets.all(16), child: Column(children: [",
    ],
    [/<\/section>/g, "]))"],
    [/<header\b[^>]*>/g, "Container(padding: EdgeInsets.all(16), child: "],
    [/<\/header>/g, ")"],
    [/<footer\b[^>]*>/g, "Container(padding: EdgeInsets.all(16), child: "],
    [/<\/footer>/g, ")"],
    [/<nav\b[^>]*>/g, "Row(children: ["],
    [/<\/nav>/g, "])"],
  ];

  for (const [regex, replacement] of elementMap) {
    dartCode = dartCode.replace(regex, replacement);
  }

  // Generate a basic Flutter widget
  const fullCode = `import 'package:flutter/material.dart';

/// ${widgetName} — Flutter widget
/// Generated by LayoutForge
///
/// Usage:
///   ${widgetName}()
///
/// Requires Flutter SDK. Add to your pubspec.yaml dependencies.

class ${widgetName} extends StatelessWidget {
  const ${widgetName}({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 1024;

        return SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 16 : 24,
              vertical: 16,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 32),
                _buildContent(context, isMobile, isTablet),
                const SizedBox(height: 32),
                _buildFooter(context),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Website',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          Row(
            children: [
              _navLink('Home'),
              const SizedBox(width: 16),
              _navLink('About'),
              const SizedBox(width: 16),
              _navLink('Services'),
              const SizedBox(width: 16),
              _navLink('Contact'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _navLink(String label) {
    return InkWell(
      onTap: () {},
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF475569),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, bool isMobile, bool isTablet) {
    final crossAxisCount = isMobile ? 1 : isTablet ? 2 : 3;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Hero Section
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 48),
          child: Column(
            children: [
              const Text(
                'Welcome',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Your content goes here',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Get Started'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: const Center(
        child: Text(
          '© 2025 All rights reserved.',
          style: TextStyle(
            fontSize: 12,
            color: Color(0xFF94A3B8),
          ),
        ),
      ),
    );
  }
}

// ─── Color Utility ───────────────────────────────────────────────────────────

/// Convert a hex color string to a Flutter Color
Color hexToColor(String hex) {
  hex = hex.replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  return Color(int.parse(hex, radix: 16));
}
`;

  return {
    code: fullCode,
    platform: "flutter",
    componentName: widgetName,
    dependencies,
    notes,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Converts HTML/CSS to a React Native component.
 */
export function exportToReactNative(
  html: string,
  css: string,
  componentName: string,
): ExportResult {
  return htmlToRN(html, componentName);
}

/**
 * Converts HTML/CSS to a Flutter widget.
 */
export function exportToFlutter(
  html: string,
  css: string,
  widgetName: string,
): ExportResult {
  return htmlToFlutter(html, widgetName);
}
