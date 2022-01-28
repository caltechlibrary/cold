SELECT IFNULL(funders_grant_number, "") as funders_grant_number,
       IFNULL(funders_agency, "Unknown") AS funders_agency
FROM eprint_funders_agency JOIN eprint_funders_grant_number
ON (eprint_funders_agency.eprintid = eprint_funders_grant_number.eprintid) AND
(eprint_funders_agency.pos = eprint_funders_grant_number.pos)
GROUP BY eprint_funders_grant_number.funders_grant_number, eprint_funders_agency.funders_agency
