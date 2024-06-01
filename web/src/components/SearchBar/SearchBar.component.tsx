import styled from "styled-components";
import { Row } from "../Row";
import { ArrowRight } from "../../assets";

interface SearchBarProps {
  placeholderText: string;
}

export const SearchBar = ({placeholderText}: SearchBarProps) => {

  return (
    <RowContainer>
      <Row childrenflex={false}>
        <SearchBarContainer placeholder={placeholderText} />
        <SearchButton>
          <ArrowRight />
        </SearchButton>
      </Row>
    </RowContainer>


  )
}

const RowContainer = styled.div`
  background: var(--appBackground);
  display: flex;
  width: 300px;
  border: 3px solid var(--textBlack);
  border-radius: 5px;
`

const SearchBarContainer = styled.input`
  width: 230px;
  overflow: auto;
  padding: 10px;
  padding-right: 0px;
  border: none;
  font-family: 'Open Sans';
  font-weight: 600;
  outline: none;
`

const SearchButton = styled.div`
  background: var(--appYellow);
  width: 34px;
  height: 34px;
  border-radius: 5px;
  cursor: pointer;

  & svg {
    width: 100%;
    height: 100%;
    scale: 0.6;
  }
`


