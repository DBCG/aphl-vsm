import styled from 'styled-components'

interface InputProps {
  minWidth?: number
  onChange: React.ChangeEventHandler | undefined
}

const Input = styled.textarea<InputProps>`
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
  width: 100%;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  placeholder?: string
  onChange?: React.ChangeEventHandler
  value?: string
  def?: string
  minWidth?: number
  hasIcon?: boolean
  disabled?: boolean
  style?: React.CSSProperties
}

const FilterTextArea = ({ placeholder, onChange, value, def, style, minWidth, disabled = false }: Props) => {
  return (
    <Container>
      <Input
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        onChange={onChange}
        minWidth={minWidth}
        disabled={disabled}
        value={value}
        defaultValue={def}
        style={style}
      />
    </Container>
  )
}

export { FilterTextArea }
