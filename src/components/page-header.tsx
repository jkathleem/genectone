import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

type HeaderAction = {
  label: string;
  href: string;
};

export function PageHeader({
  action,
  breadcrumb,
  children,
  description,
  primaryAction,
  secondaryActions = [],
  title,
}: {
  title: string;
  description?: string;
  action?: HeaderAction;
  breadcrumb?: BreadcrumbItem[];
  children?: ReactNode;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
}) {
  const resolvedPrimaryAction = primaryAction ?? action;

  return (
    <div className="page-header">
      <div>
        {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {resolvedPrimaryAction || secondaryActions.length > 0 ? (
        <div className="page-header-actions">
          {secondaryActions.map((secondaryAction) => (
            <Button href={secondaryAction.href} key={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </Button>
          ))}
          {resolvedPrimaryAction ? <Button href={resolvedPrimaryAction.href}>{resolvedPrimaryAction.label}</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
