function Table(tbl)
  for _, head in ipairs(tbl.head.rows) do
    for _, cell in ipairs(head.cells) do
      cell.attr.attributes["scope"] = "col"
    end
  end
  return tbl
end
