<?php
// config/holiday-taxis.php - API Configuration (Support both Production and Test)
class HolidayTaxisConfig
{
    // Production API (Default)
    const API_KEY = 'htscon_fd8a9d60c363c15e3be1ff427dac2e31f5ee1521eeac523fb7c655899acf414cb45135d7dcd81841';
    const API_ENDPOINT = 'https://suppliers.holidaytaxis.com';
    const API_VERSION = '2025-01';

    // Test API
    const TEST_API_KEY = 'htscon_40b5cf18a8c98dc9f01a7fb65806ed8aefdabfe7f6130dcd6bfbc91ab1fd4c4f79966d6ba1304650';
    const TEST_API_ENDPOINT = 'https://suppliers.htxstaging.com';
    const TEST_API_VERSION = '2025-01';

    // Helper methods to get API config
    public static function getApiKey($useTest = false)
    {
        return $useTest ? self::TEST_API_KEY : self::API_KEY;
    }

    public static function getApiEndpoint($useTest = false)
    {
        return $useTest ? self::TEST_API_ENDPOINT : self::API_ENDPOINT;
    }

    public static function getApiVersion($useTest = false)
    {
        return $useTest ? self::TEST_API_VERSION : self::API_VERSION;
    }
}
