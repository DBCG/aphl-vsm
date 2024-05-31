interface StyleOptions {
  maxWidth?: string
  minWidth?: string
}

export const reactSelectOptionStyle = (props?: StyleOptions | undefined) => {

  return ({
    multiValueLabel: (styles: any) => ({
      ...styles,
      whiteSpace: 'wrap',
    }),
    control: (styles: any) => ({
      ...styles,
      minWidth: props?.minWidth || 'inherit',
      maxWidth: props?.maxWidth || 'inherit',
    }),
    menu: (provided: any, state: any) => {
      return { 
        ...provided,
        zIndex: 9999
      }
    }
  })
}