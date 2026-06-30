PUBLISHED_STATUS = "published"


def can_retrieve_source(status: str) -> bool:
    return status == PUBLISHED_STATUS


def publish_source(source) -> None:
    source.status = PUBLISHED_STATUS
