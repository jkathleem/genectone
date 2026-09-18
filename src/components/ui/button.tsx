import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type BaseButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonAsLinkProps = BaseButtonProps & {
  href: string;
  type?: never;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href">;

type ButtonAsButtonProps = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  ghost: "button-ghost",
  danger: "button-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "button-sm",
  md: "",
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Button(props: ButtonProps) {
  const { className, variant = "primary", size = "md" } = props;
  const classes = cx(variantClasses[variant], sizeClasses[size], className);

  if ("href" in props && props.href) {
    const linkOnlyProps = props as ButtonAsLinkProps;
    const { href, children: linkChildren, className: _className, variant: _variant, size: _size, ...linkProps } = linkOnlyProps;
    void _className;
    void _variant;
    void _size;
    return (
      <Link className={classes} href={href} {...linkProps}>
        {linkChildren}
      </Link>
    );
  }

  const buttonOnlyProps = props as ButtonAsButtonProps;
  const { children: buttonChildren, className: _className, variant: _variant, size: _size, ...buttonProps } = buttonOnlyProps;
  void _className;
  void _variant;
  void _size;
  return (
    <button className={classes} {...buttonProps}>
      {buttonChildren}
    </button>
  );
}
