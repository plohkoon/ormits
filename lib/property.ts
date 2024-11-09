interface Props {}

export function property(props?: Props) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    return target;
  };
}
