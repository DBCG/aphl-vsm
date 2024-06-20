import styled from "styled-components"

const List = styled.ul``
const InnerList = styled.ul``
const Li = styled.li``
const A = styled.a``

export const Menu = ({ anchorLinkData }) => {
  const listItems = anchorLinkData.map(i => (
    <>
      <Li>
        <A href={`#grouper-${anchorLinkData.vsTableId}`}>
          Grouper
        </A>
        </Li>
      <Li>
        <InnerList>
          <Li>
            <A href={`#vs-table-${anchorLinkData.vsTableId}`}>ValueSets</A>
          </Li>
          <Li>
            <A href={`#code-table-${anchorLinkData.vsTableId}`}>Codes</A>
          </Li>
        </InnerList>

      </Li>
    </>
  ))
  return (
    <div>
      <List>
        {listItems}
      </List>
    </div>
  )
}