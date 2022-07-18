import styled from 'styled-components'
import Image from 'next/image'

interface InputProps {
  minWidth?: number;
  onChange: React.ChangeEventHandler | undefined;
}

const Input = styled.input<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

export const StyledLabel = styled.label`
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--theme-500);
  display: inline-block;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
`

const TooltipContainer = styled.div`
  position: absolute;
  bottom: 18px;
  background-color: white;
  padding: 2px 8px;
  width: 150px;
  display: none;
`

const InfoContainer = styled.div`
  position: relative;
  transform: translateY(-8px);
  &:hover {
    cursor: pointer;
  }
  &:hover ${TooltipContainer} {
    display: unset;
  }
`

const ToolTipText = styled.p`
  font-size: 80%;
`

interface Props {
  placeholder?: string,
  onChange?: React.ChangeEventHandler,
  label?: string,
  id?: string,
  value?: string,
  def?: string,
  minWidth?: number,
  hasIcon?: boolean,
  disabled?: boolean,
  includeInfo?: boolean,
  info?: string,
  style?: React.CSSProperties
}

const SearchInput = ({
  placeholder,
  onChange,
  label,
  value,
  def,
  id,
  style,
  minWidth,
  includeInfo,
  info,
  disabled = false
}: Props) => {
  return (
    <Container>
      <FlexRow>
      {
        (label !== undefined && id !== undefined) &&
        <StyledLabel>
          {label}
        </StyledLabel>
      }
      { includeInfo && (
        <InfoContainer>
          <Image width={16} height={16} alt='' src='/images/information-circle.svg' />
          <TooltipContainer>
            <ToolTipText>
              {info}
            </ToolTipText>
          </TooltipContainer>
        </InfoContainer>
      )}
      </FlexRow>
      <Input
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

export { SearchInput }