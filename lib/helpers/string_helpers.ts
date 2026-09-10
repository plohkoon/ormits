// TODO: Replace all of this with a real inflector because that would be awesome.
export function tableize(name: string): string {
  return (
    name
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      .toLowerCase() + "s"
  );
}
