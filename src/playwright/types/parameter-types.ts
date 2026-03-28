import { Locator } from '@playwright/test';

export type VisibilityOption = { onlyVisible: true };

export type LocatorOptions = Parameters<Locator['locator']>[1] & VisibilityOption;
export type GetByRoleOptions = Parameters<Locator['getByRole']>[1] & VisibilityOption;
export type GetByTextOptions = Parameters<Locator['getByText']>[1] & VisibilityOption;
export type GetByLabelOptions = Parameters<Locator['getByLabel']>[1] & VisibilityOption;
export type GetByPlaceholderOptions = Parameters<Locator['getByPlaceholder']>[1] & VisibilityOption;
export type GetByRoleTypes = Parameters<Locator['getByRole']>[0] & VisibilityOption;
