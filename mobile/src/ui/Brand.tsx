import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { spacing, typography } from "@turma-certa/tokens";
import { useTheme } from "../lib/theme";

export const LOGO_PURPLE = "#a32fd9";
export const LOGO_LIME = "#adf743";
export const LOGO_VIEWBOX = "176 96 1660 1660";
export const LOGO_OUTER_ARC = "M958 300 A716 666 0 0 0 958 1632";
export const LOGO_INNER_ARC = "M958 600 A388 366 0 0 0 958 1332";
export const LOGO_T =
  "M736 525H1739V929H1433V1680H1043V929H736ZM866 663V793H1172V1543H1302V793H1609V663Z";

/** Same mark as web `LogoMark` (tennis). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={LOGO_VIEWBOX}>
      <G fill="none" stroke={LOGO_PURPLE} strokeWidth={97}>
        <Path d={LOGO_OUTER_ARC} />
        <Path d={LOGO_INNER_ARC} />
      </G>
      <G fill={LOGO_PURPLE}>
        <Rect x={940} y={252} width={799} height={95} />
        <Rect x={861} y={1290} width={97} height={340} />
      </G>
      <Path fill={LOGO_LIME} fillRule="evenodd" d={LOGO_T} />
      <G>
        <Defs>
          <ClipPath id="ball">
            <Circle cx={1000} cy={330} r={110 * 1.6} />
          </ClipPath>
        </Defs>
        <Circle cx={1000} cy={330} r={110 * 1.6} fill={LOGO_LIME} />
        <G clipPath="url(#ball)" fill="none" stroke={LOGO_PURPLE} strokeWidth={16 * 1.6} strokeLinecap="round">
          <Path d="M900 250 Q1086 342 1054 522" transform="translate(100,80)" />
          <Path d="M1104 174 Q1016 334 1160 454" transform="translate(0,40)" />
        </G>
        <Circle cx={1000} cy={330} r={110 * 1.6} fill="none" stroke={LOGO_PURPLE} strokeWidth={14 * 1.6} />
      </G>
    </Svg>
  );
}

/** Prefer raster asset for perfect parity with web PNGs. */
export function LogoImage({ size = 40 }: { size?: number }) {
  const { theme } = useTheme();
  const source =
    theme === "dark"
      ? require("../../assets/turma-certa-mark-dark.png")
      : require("../../assets/turma-certa-mark.png");
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="Turma Certa" />;
}

export function BrandMark({ compact, size = 40 }: { compact?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.brand}>
      <LogoImage size={size} />
      {compact ? null : (
        <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>
          Turma Certa
        </Text>
      )}
    </View>
  );
}

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <BrandMark size={44} />
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  name: {
    fontFamily: typography.fontDisplayBold,
    fontSize: typography.sizeLg,
    fontWeight: "700",
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizeSm,
    lineHeight: 18,
  },
});
