import { Column } from "../Column";
import { ListingSubText, ListingText } from "../Typography"
import { useState } from "react";
import { ItemListingProps } from "./ItemListing.types";
import { ItemListingContainer } from "./ItemListing.styled";
import { Link } from "react-router-dom";

export const ItemListing = ({id, title, author}: ItemListingProps) => {

  const [hover, setHover] = useState(false);

  return (
    <Link to={`/patterns/${id}`}>
      <ItemListingContainer hover={hover} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <Column crossaxisalignment="start" spacing={12}>
          <ListingText>{title}</ListingText>
          {author && <ListingSubText><span style={{fontStyle: "italic"}}>by</span> {author}</ListingSubText>}
        </Column>
      </ItemListingContainer>
    </Link>
  )

}
