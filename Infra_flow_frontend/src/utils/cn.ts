type ClassValue = string | undefined | false | null;

export const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(' ');
