from book_inventory.accounts.throttles import ClientIPRateThrottle


class IsbnLookupThrottle(ClientIPRateThrottle):
    """Each lookup makes two requests to Open Library, so keep one visitor from running up many."""

    scope = "isbn_lookup"
