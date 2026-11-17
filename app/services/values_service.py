"""Values catalog adapter — thin above ValuesRepository.

No business rules, no HTTP errors: the repo's nested dicts become the
response models as-is (ordering and shape are fixed inside the repository).
"""

from app.repositories.values_repository import ValuesRepository
from app.schemas.values import TemplateRowResponse, ValueRowResponse


class ValuesService:
    def __init__(self, repo: ValuesRepository) -> None:
        self._repo = repo

    async def active_values(self) -> list[ValueRowResponse]:
        values = await self._repo.active_values_with_templates()
        return [
            ValueRowResponse(
                id=value["id"],
                key=value["key"],
                label=value["label"],
                templates=[
                    TemplateRowResponse(
                        id=template["id"],
                        name=template["name"],
                        emoji=template.get("emoji"),
                        art_urls=template.get("art_urls", []),
                        prefill=template.get("prefill"),
                    )
                    for template in value.get("templates", [])
                ],
            )
            for value in values
        ]
