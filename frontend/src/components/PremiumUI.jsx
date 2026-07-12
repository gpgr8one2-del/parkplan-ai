import React from "react";

import {
  TOHI_THEME_COLORS,
  TOHI_THEME_GRADIENTS,
  TOHI_THEME_RADII,
  TOHI_THEME_SHADOWS,
  TOHI_THEME_SPACING,
  TOHI_THEME_TYPOGRAPHY,
} from "../theme/tohiTheme";

const chipToneStyles = {
  neutral: {
    background: TOHI_THEME_COLORS.cardWarm,
    color: TOHI_THEME_COLORS.text,
    borderColor: TOHI_THEME_COLORS.cardBorder,
  },
  purple: {
    background: TOHI_THEME_COLORS.purpleSoft,
    color: TOHI_THEME_COLORS.purpleDeep,
    borderColor: "rgba(124, 58, 237, 0.18)",
  },
  amber: {
    background: TOHI_THEME_COLORS.amberSoft,
    color: "#8A4B00",
    borderColor: "rgba(245, 158, 11, 0.22)",
  },
  coral: {
    background: TOHI_THEME_COLORS.coralSoft,
    color: "#9F1239",
    borderColor: "rgba(251, 113, 133, 0.22)",
  },
  sky: {
    background: TOHI_THEME_COLORS.skySoft,
    color: "#075985",
    borderColor: "rgba(56, 189, 248, 0.24)",
  },
  success: {
    background: TOHI_THEME_COLORS.successSoft,
    color: TOHI_THEME_COLORS.success,
    borderColor: "rgba(5, 150, 105, 0.22)",
  },
  error: {
    background: TOHI_THEME_COLORS.errorSoft,
    color: TOHI_THEME_COLORS.error,
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
};

const buttonVariantStyles = {
  primary: {
    background: TOHI_THEME_GRADIENTS.premiumPurple,
    color: "#FFFFFF",
    borderColor: "rgba(124, 58, 237, 0.34)",
    boxShadow: TOHI_THEME_SHADOWS.button,
  },
  secondary: {
    background: TOHI_THEME_COLORS.card,
    color: TOHI_THEME_COLORS.text,
    borderColor: TOHI_THEME_COLORS.cardBorder,
    boxShadow: TOHI_THEME_SHADOWS.soft,
  },
  warm: {
    background: TOHI_THEME_COLORS.cardWarm,
    color: TOHI_THEME_COLORS.text,
    borderColor: TOHI_THEME_COLORS.cardBorder,
    boxShadow: TOHI_THEME_SHADOWS.soft,
  },
  ghost: {
    background: "rgba(255, 255, 255, 0.5)",
    color: TOHI_THEME_COLORS.text,
    borderColor: "rgba(234, 220, 200, 0.72)",
    boxShadow: "none",
  },
};

function mergeStyles(baseStyle, customStyle) {
  return {
    ...baseStyle,
    ...(customStyle || {}),
  };
}

export function PremiumCard({
  as: Component = "section",
  children,
  className = "",
  style,
  elevated = false,
  warm = false,
  ...props
}) {
  return (
    <Component
      className={className}
      style={mergeStyles(
        {
          background: warm ? TOHI_THEME_COLORS.cardWarm : TOHI_THEME_COLORS.card,
          border: `1px solid ${TOHI_THEME_COLORS.cardBorder}`,
          borderRadius: TOHI_THEME_RADII.card,
          boxShadow: elevated ? TOHI_THEME_SHADOWS.cardElevated : TOHI_THEME_SHADOWS.card,
          padding: TOHI_THEME_SPACING.cardPadding,
          color: TOHI_THEME_COLORS.text,
        },
        style
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PremiumSectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className = "",
  style,
}) {
  return (
    <div
      className={className}
      style={mergeStyles(
        {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: TOHI_THEME_SPACING.md,
          marginBottom: TOHI_THEME_SPACING.md,
        },
        style
      )}
    >
      <div>
        {eyebrow ? (
          <div
            style={{
              color: TOHI_THEME_COLORS.purple,
              fontSize: TOHI_THEME_TYPOGRAPHY.eyebrow.fontSize,
              fontWeight: TOHI_THEME_TYPOGRAPHY.eyebrow.fontWeight,
              letterSpacing: TOHI_THEME_TYPOGRAPHY.eyebrow.letterSpacing,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        {title ? (
          <h2
            style={{
              color: TOHI_THEME_COLORS.text,
              fontSize: TOHI_THEME_TYPOGRAPHY.sectionTitle.fontSize,
              lineHeight: TOHI_THEME_TYPOGRAPHY.sectionTitle.lineHeight,
              fontWeight: TOHI_THEME_TYPOGRAPHY.sectionTitle.fontWeight,
              margin: 0,
            }}
          >
            {title}
          </h2>
        ) : null}

        {subtitle ? (
          <p
            style={{
              color: TOHI_THEME_COLORS.muted,
              fontSize: TOHI_THEME_TYPOGRAPHY.body.fontSize,
              lineHeight: TOHI_THEME_TYPOGRAPHY.body.lineHeight,
              margin: "6px 0 0",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function PremiumStatusChip({
  children,
  icon,
  tone = "neutral",
  className = "",
  style,
  ...props
}) {
  const toneStyle = chipToneStyles[tone] || chipToneStyles.neutral;

  return (
    <span
      className={className}
      style={mergeStyles(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          width: "fit-content",
          minHeight: 28,
          padding: "6px 10px",
          borderRadius: TOHI_THEME_RADII.pill,
          border: `1px solid ${toneStyle.borderColor}`,
          background: toneStyle.background,
          color: toneStyle.color,
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1,
          whiteSpace: "nowrap",
        },
        style
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function PremiumPillButton({
  as: Component = "button",
  children,
  icon,
  trailingIcon,
  variant = "primary",
  className = "",
  style,
  ...props
}) {
  const variantStyle = buttonVariantStyles[variant] || buttonVariantStyles.primary;

  return (
    <Component
      className={className}
      style={mergeStyles(
        {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 42,
          padding: "10px 16px",
          borderRadius: TOHI_THEME_RADII.pill,
          border: `1px solid ${variantStyle.borderColor}`,
          background: variantStyle.background,
          color: variantStyle.color,
          boxShadow: variantStyle.boxShadow,
          fontSize: 14,
          fontWeight: 850,
          lineHeight: 1,
          textDecoration: "none",
          cursor: Component === "button" ? "pointer" : "default",
        },
        style
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
      {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
    </Component>
  );
}

export function PremiumPageHero({
  children,
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  className = "",
  style,
  night = false,
  ...props
}) {
  return (
    <section
      className={className}
      style={mergeStyles(
        {
          position: "relative",
          overflow: "hidden",
          borderRadius: TOHI_THEME_RADII.hero,
          border: `1px solid ${TOHI_THEME_COLORS.cardBorder}`,
          background: night
            ? TOHI_THEME_GRADIENTS.heroNight
            : TOHI_THEME_GRADIENTS.heroDay,
          boxShadow: TOHI_THEME_SHADOWS.hero,
          color: TOHI_THEME_COLORS.text,
          padding: TOHI_THEME_SPACING.heroPadding,
        },
        style
      )}
      {...props}
    >
      {eyebrow ? (
        <div
          style={{
            color: TOHI_THEME_COLORS.purpleDeep,
            fontSize: TOHI_THEME_TYPOGRAPHY.eyebrow.fontSize,
            fontWeight: TOHI_THEME_TYPOGRAPHY.eyebrow.fontWeight,
            letterSpacing: TOHI_THEME_TYPOGRAPHY.eyebrow.letterSpacing,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      {title ? (
        <h1
          style={{
            color: TOHI_THEME_COLORS.text,
            fontSize: TOHI_THEME_TYPOGRAPHY.heroTitle.fontSize,
            lineHeight: TOHI_THEME_TYPOGRAPHY.heroTitle.lineHeight,
            fontWeight: TOHI_THEME_TYPOGRAPHY.heroTitle.fontWeight,
            margin: 0,
          }}
        >
          {title}
        </h1>
      ) : null}

      {subtitle ? (
        <p
          style={{
            color: TOHI_THEME_COLORS.muted,
            fontSize: TOHI_THEME_TYPOGRAPHY.bodyLarge.fontSize,
            lineHeight: TOHI_THEME_TYPOGRAPHY.bodyLarge.lineHeight,
            margin: "10px 0 0",
            maxWidth: 560,
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {meta ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: TOHI_THEME_SPACING.md,
          }}
        >
          {meta}
        </div>
      ) : null}

      {actions ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: TOHI_THEME_SPACING.lg,
          }}
        >
          {actions}
        </div>
      ) : null}

      {children ? (
        <div style={{ marginTop: TOHI_THEME_SPACING.lg }}>{children}</div>
      ) : null}
    </section>
  );
}

export const premiumUiComponentNames = [
  "PremiumCard",
  "PremiumSectionHeader",
  "PremiumStatusChip",
  "PremiumPillButton",
  "PremiumPageHero",
];
