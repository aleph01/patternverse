import styled from "styled-components";

export const HeaderContainer = styled.div`
  position: sticky;
  top: 0;
  margin-top: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
`;

export const InnerContainer = styled.div`
  display: inline-flex;
  justify-content: start;
  align-items: center;
  width: 100%;
  margin: 12px;
`

export const PVLogoContainer = styled.div`
  & svg {
    height: 42px;
    width: 42px;
    transform: translate(8px, 8px);
  }
`