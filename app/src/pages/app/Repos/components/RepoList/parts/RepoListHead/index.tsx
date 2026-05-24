import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { I18nNamespace } from "@/lib/constants/i18n.constants";

const TableHead = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.6fr) minmax(130px, 0.9fr) 110px 120px minmax(140px, auto)",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 0,
  backgroundColor: theme.palette.surface.interface.base,
  zIndex: 1,
})) as typeof Box;

const HeadCell = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 10.5,
  fontWeight: 600,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
})) as typeof Typography;

const ActionsHeadCell = styled(HeadCell)({
  justifySelf: "end",
}) as typeof Typography;

export function RepoListHead() {
  const { t } = useTranslation(I18nNamespace.COMMON);
  return (
    <TableHead>
      <HeadCell>{t("repos.col.repository")}</HeadCell>
      <HeadCell>{t("repos.col.branch")}</HeadCell>
      <HeadCell>{t("repos.col.status")}</HeadCell>
      <HeadCell>{t("repos.col.activity")}</HeadCell>
      <ActionsHeadCell>{t("repos.col.actions")}</ActionsHeadCell>
    </TableHead>
  );
}

export default RepoListHead;
